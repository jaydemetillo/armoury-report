import * as THREE from 'three';

const deg = THREE.MathUtils.degToRad;

// Scratch vectors for the framing offset — reused so update() stays allocation
// free at 60fps.
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();

/** Hermite smoothstep — eases every keyframe segment so dwells feel settled
 *  and sweeps accelerate/decelerate like a camera operator, not a lerp. */
const smoothstep = (t) => t * t * (3 - 2 * t);

/**
 * Scroll-driven orbital camera.
 *
 * The camera lives on a sphere around the model's center (the world origin):
 * constant base radius = auto-framed distance, azimuth/polar/zoom keyframed
 * against scroll progress in config.js. lookAt(origin) runs every frame,
 * which is what guarantees the model never drifts off-center and the
 * distance never "breaks" — the two invariants of the brief.
 *
 * Raw ScrollTrigger progress is exponentially damped here, so notchy mouse
 * wheels produce one continuous cinematic move instead of stepped jumps.
 */
export class CameraRig {
  constructor(scene3d) {
    this.scene3d = scene3d;
    this.cfg = scene3d.cfg;
    this.targetProgress = 0;
    this.progress = 0; // damped
    this.lookTarget = new THREE.Vector3(0, 0, 0);
    // Accessibility: when the OS asks for reduced motion, track scroll
    // directly instead of gliding after it.
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  setTargetProgress(p) {
    this.targetProgress = THREE.MathUtils.clamp(p, 0, 1);
  }

  /** Interpolate azimuth/polar/zoom from the keyframe track. */
  sample(p) {
    const k = this.cfg.CAMERA_KEYFRAMES;
    if (p <= k[0].p) return k[0];
    if (p >= k[k.length - 1].p) return k[k.length - 1];
    let i = 0;
    while (p > k[i + 1].p) i++;
    const a = k[i];
    const b = k[i + 1];
    const t = smoothstep((p - a.p) / (b.p - a.p));
    return {
      azimuth: THREE.MathUtils.lerp(a.azimuth, b.azimuth, t),
      polar: THREE.MathUtils.lerp(a.polar, b.polar, t),
      zoom: THREE.MathUtils.lerp(a.zoom, b.zoom, t),
    };
  }

  /**
   * The crop multiplier for the current viewport.
   *
   * Returns CAMERA_SETTINGS.distanceScale unchanged on anything landscape —
   * the desktop framing is deliberately tight and must not move. On portrait
   * viewports it eases toward narrowCrop.minScale in proportion to how narrow
   * things get, because the same tight crop cuts a long subject off at the
   * screen edges on a phone. Ramping rather than switching means rotating a
   * device or dragging a window across the threshold does not jump.
   */
  /**
   * Which framing profile this viewport uses, 'mobile' or 'desktop'.
   *
   * Measured off the CANVAS rather than the window: the tuner's device preview
   * resizes the stage while the window stays put, so keying off the window
   * would leave you editing the desktop profile while looking at a phone.
   * Compact on EITHER axis counts, so a sideways phone (wide but short) is
   * still mobile.
   */
  framingProfile() {
    const f = this.cfg.CAMERA_SETTINGS.framing;
    if (!f) return 'desktop';
    const { clientWidth: w, clientHeight: h } = this.scene3d.canvas;
    const compact =
      (w > 0 && w < f.compactBelowWidth) || (h > 0 && h < f.compactBelowHeight);
    return compact ? 'mobile' : 'desktop';
  }

  /** The active profile's authored offset + zoom. */
  activeFraming() {
    const f = this.cfg.CAMERA_SETTINGS.framing;
    return (f && f[this.framingProfile()]) || { offset: [0, 0], zoom: 1 };
  }

  /**
   * Final crop multiplier: the automatic corrections, times the active
   * profile's authored zoom. Multiplying rather than overriding is what lets
   * an author pull the model back on mobile without disabling the safety
   * layers that stop it being clipped.
   */
  distanceScale() {
    return this.autoDistanceScale() * (this.activeFraming().zoom || 1);
  }

  /** Crop multiplier from the automatic corrections alone. */
  autoDistanceScale() {
    const { distanceScale, narrowCrop, cardClearance } = this.cfg.CAMERA_SETTINGS;

    // Short landscape steps back a little so the card-clearance lift below
    // does not carry the model off the top of the frame.
    const clearanceT = this.cardClearanceRamp();
    if (clearanceT > 0 && cardClearance) {
      return THREE.MathUtils.lerp(
        distanceScale, Math.max(distanceScale, cardClearance.minScale), clearanceT);
    }

    if (!narrowCrop) return distanceScale;
    const aspect = this.scene3d.camera.aspect;
    if (aspect >= narrowCrop.belowAspect) return distanceScale;
    // Fully applied by `fullyByAspect` — tablets in portrait (~0.75) need the
    // whole correction, not half of it, so the ramp cannot run all the way
    // down to phone aspects before it takes full effect.
    const t = THREE.MathUtils.clamp(
      (narrowCrop.belowAspect - aspect) /
        (narrowCrop.belowAspect - narrowCrop.fullyByAspect), 0, 1);
    return THREE.MathUtils.lerp(
      distanceScale, Math.max(distanceScale, narrowCrop.minScale), t);
  }

  update(dt) {
    if (this.reducedMotion) {
      this.progress = this.targetProgress;
    } else {
      // Exponential damping: frame-rate independent, silky on any wheel/trackpad.
      const alpha = 1 - Math.exp(-this.cfg.MOTION.progressDamping * dt);
      this.progress += (this.targetProgress - this.progress) * alpha;
    }

    const { azimuth, polar, zoom } = this.sample(this.progress);
    const radius =
      this.scene3d.framedRadius() * zoom * this.distanceScale();

    const az = deg(azimuth);
    const pol = deg(polar);
    const cam = this.scene3d.camera;
    cam.position.set(
      radius * Math.sin(az) * Math.cos(pol),
      radius * Math.sin(pol),
      radius * Math.cos(az) * Math.cos(pol)
    );

    // Point at the model center first: the framing offset below is strictly
    // perpendicular to the view, so it never changes where the camera aims.
    cam.lookAt(0, 0, 0);
    this.applyFramingOffset(radius);
    cam.lookAt(this.lookTarget);
  }

  /**
   * Slide the model around the canvas without touching the orbit.
   *
   * Moves the camera AND its look target by the same screen-aligned vector, so
   * the view direction is unchanged and the whole scene — model, highlight box
   * and contact shadow alike — shifts together on screen. Working from the
   * camera's own right/up axes (rather than world axes) is what keeps the
   * model at a fixed spot in frame as the rig orbits around it.
   *
   * The offset is a fraction of the VIEWPORT, converted to world units from
   * the fov and the current distance, so the same config frames identically on
   * a phone and a widescreen monitor.
   */
  /**
   * Extra upward framing applied on short landscape viewports so the story
   * card does not land on top of the model. Returns 0 everywhere else —
   * portrait phones and any normal-height window are untouched.
   */
  cardClearanceOffset() {
    const cc = this.cfg.CAMERA_SETTINGS.cardClearance;
    return cc ? cc.offsetY * this.cardClearanceRamp() : 0;
  }

  /**
   * 0 → 1 ramp for how much card clearance this viewport needs. Zero unless
   * the viewport is landscape AND short, so portrait phones and ordinary
   * windows are untouched. Shared by the lift and the paired step-back so the
   * two can never disagree about when they apply.
   */
  cardClearanceRamp() {
    const cc = this.cfg.CAMERA_SETTINGS.cardClearance;
    if (!cc || this.scene3d.camera.aspect <= 1) return 0;
    const height = this.scene3d.canvas.clientHeight;
    if (!height || height >= cc.belowHeight) return 0;
    return THREE.MathUtils.clamp(
      (cc.belowHeight - height) / (cc.belowHeight - cc.fullyByHeight), 0, 1);
  }

  applyFramingOffset(radius) {
    const cam = this.scene3d.camera;
    // The active profile's authored offset, plus the automatic card clearance.
    const [ox, oy] = this.activeFraming().offset;
    const fx = ox;
    const fy = oy + this.cardClearanceOffset();

    if (!fx && !fy) {
      this.lookTarget.set(0, 0, 0);
      return;
    }

    cam.updateMatrixWorld();
    const halfH = radius * Math.tan(deg(cam.fov) / 2);
    const halfW = halfH * cam.aspect;
    // Negated: to push the model right on screen, the camera trucks left.
    _right.setFromMatrixColumn(cam.matrixWorld, 0).multiplyScalar(-fx * 2 * halfW);
    _up.setFromMatrixColumn(cam.matrixWorld, 1).multiplyScalar(-fy * 2 * halfH);

    this.lookTarget.copy(_right).add(_up);
    cam.position.add(this.lookTarget);
  }
}
