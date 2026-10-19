import {
  Vector2, Vector3, Vector4, Quaternion, Matrix4, Spherical, Box3, Sphere, Raycaster,
  MathUtils,
} from 'three';
import CameraControls from 'camera-controls';

// The library only needs this slice of three; passing the subset instead of
// the whole namespace keeps the tuner chunk from re-bundling three.
CameraControls.install({
  THREE: { Vector2, Vector3, Vector4, Quaternion, Matrix4, Spherical, Box3, Sphere, Raycaster },
});

/**
 * Free-look authoring camera (yomotsu/camera-controls), for the tuner only.
 *
 * The shipped experience is scroll-driven and deliberately not drag-to-orbit
 * (see the Mobile & accessibility notes in the README) — attaching orbit
 * handlers in production is exactly what breaks vertical scrolling on touch.
 * So this exists to *author* keyframes, not to replace the rig: fly to an
 * angle you like, and `toKeyframe()` inverts your camera position back into
 * the `{ p, azimuth, polar, zoom }` line that CAMERA_KEYFRAMES already speaks.
 *
 * While free-look is on, the scroll rig is suspended (`control.suspendCamera`)
 * so the two never fight over camera.position.
 */
export class FreeLook {
  constructor(scene3d, control, rig) {
    this.scene3d = scene3d;
    this.control = control;
    // The rig's look target is the orbit center. It is the origin normally,
    // but CAMERA_SETTINGS.framing trucks it off-centre — so every
    // reference below goes through it rather than assuming (0,0,0).
    this.rig = rig;
    this.enabled = false;

    this.controls = new CameraControls(scene3d.camera, scene3d.canvas);
    this.controls.enabled = false;

    // Keep the operator inside distances where the model still frames well.
    const r = scene3d.framedRadius();
    this.controls.minDistance = r * 0.35;
    this.controls.maxDistance = r * 3;
    this.controls.smoothTime = 0.18;
    this.controls.draggingSmoothTime = 0.08;
    this.controls.dollyToCursor = true;

    // Don't let the operator roll under the floor or over the top pole — both
    // produce keyframes the rig's polar term cannot reproduce.
    this.controls.minPolarAngle = MathUtils.degToRad(4);
    this.controls.maxPolarAngle = MathUtils.degToRad(160);

    const c = this.orbitCenter();
    this.controls.setTarget(c.x, c.y, c.z, false);
  }

  /** Where the rig orbits around — origin, plus any framing offset. */
  orbitCenter() {
    return this.rig.lookTarget;
  }

  setEnabled(on) {
    this.enabled = on;
    this.controls.enabled = on;
    this.control.suspendCamera = on;
    if (on) {
      // Adopt exactly what the rig was showing — same eye, same target — so
      // enabling free-look never jumps, framing offset included.
      const p = this.scene3d.camera.position;
      const c = this.orbitCenter();
      this.controls.setLookAt(p.x, p.y, p.z, c.x, c.y, c.z, false);
    }
  }

  /** Snap the orbit target back to the rig's center (the rig's invariant). */
  recenter() {
    const c = this.orbitCenter();
    this.controls.setTarget(c.x, c.y, c.z, true);
  }

  /**
   * How far the orbit target has drifted from the rig's own center, as a
   * fraction of the model radius. Truck/pan moves the target, and a keyframe
   * captured with a drifted target will not reproduce — the rig only ever
   * looks at its center. The tuner surfaces this as a warning.
   */
  targetDrift() {
    const t = this.controls.getTarget(new Vector3());
    return t.sub(this.orbitCenter()).length() / this.scene3d.boundingRadius;
  }

  /**
   * Invert the current camera position into the rig's spherical convention.
   *
   * The rig places the camera at:
   *   x = r·sin(az)·cos(pol),  y = r·sin(pol),  z = r·cos(az)·cos(pol)
   * so this is that solved for (az, pol, r), with r divided back out by the
   * auto-framed radius to recover the per-keyframe `zoom` multiplier.
   *
   * `refAzimuth` keeps the track monotonic: CAMERA_KEYFRAMES sweeps
   * 78° -> 274° continuously rather than wrapping through 0, so a raw
   * [0,360) reading would make the camera spin the long way round. Passing the
   * rig's current azimuth picks the co-terminal angle nearest to it.
   */
  toKeyframe(refAzimuth = null) {
    // Measure from the orbit target, not the world origin: with a framing
    // offset (or a trucked target) the camera is no longer on a sphere around
    // (0,0,0), and |position| would read as a bogus radius.
    const t = this.controls.getTarget(new Vector3());
    const p = this.scene3d.camera.position.clone().sub(t);
    const radius = p.length();
    const polar = MathUtils.radToDeg(Math.asin(MathUtils.clamp(p.y / radius, -1, 1)));
    let azimuth = MathUtils.radToDeg(Math.atan2(p.x, p.z));
    if (azimuth < 0) azimuth += 360;

    if (refAzimuth != null) {
      const k = Math.round((refAzimuth - azimuth) / 360);
      azimuth += k * 360;
    }

    // Divide by the rig's EFFECTIVE crop, not the raw config value — on a
    // portrait viewport narrowCrop eases distanceScale up, and using the raw
    // number here would bake that correction into every captured zoom.
    const zoom = radius / (this.scene3d.framedRadius() * this.rig.distanceScale());
    return { azimuth, polar, zoom };
  }

  update(dt) {
    return this.controls.update(dt);
  }

  dispose() {
    this.controls.dispose();
  }
}
