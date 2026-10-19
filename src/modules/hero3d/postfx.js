import { HalfFloatType } from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  NormalPass,
  BloomEffect,
  VignetteEffect,
  SSAOEffect,
  BlendFunction,
} from 'postprocessing';
import { TIER_PROFILE, postFXWanted, aoWanted } from './quality.js';

/**
 * Optional post-processing chain (pmndrs/postprocessing).
 *
 * Deliberately small: selective-feeling bloom plus a vignette. The point is to
 * make the highlight's emissive boost actually *glow* — the shader in
 * highlights.js already pushes `totalEmissiveRadiance` on the focused region,
 * and a thresholded bloom is what turns that from "brighter pixels" into light
 * spilling off the part being discussed. Everything below the luminance
 * threshold is untouched, so the clay look is bit-identical when no highlight
 * is active.
 *
 * Why pmndrs/postprocessing over three's own EffectComposer: it merges every
 * effect into a single fullscreen shader pass instead of one pass per effect.
 * On tile-based mobile GPUs each extra fullscreen pass is a full framebuffer
 * round-trip, so merging is the difference between "affordable" and "not".
 *
 * Why no SMAA: the composer's `multisampling` gives real MSAA on WebGL2, which
 * is both better and cheaper here, and SMAA ships lookup textures as data:
 * URIs — which the strict-CSP hosts this project targets refuse (see the
 * texture-recovery note in scene.js). On the low tier post-processing is off
 * entirely, so the renderer's own `antialias: true` covers that case.
 */
export class PostFX {
  constructor(scene3d, tier) {
    this.scene3d = scene3d;
    this.cfg = scene3d.cfg;
    this.tier = tier;
    this.composer = null;
    this.bloom = null;
    this.vignette = null;
    this.ao = null;
    this.normalPass = null;
    this.available = false;
    this.enabled = false;

    if (!postFXWanted(this.cfg, tier)) return;

    try {
      this._build();
      this.available = true;
      this.enabled = true;
    } catch (err) {
      // A composer failure must never take the page down — the scene renders
      // perfectly well without it.
      console.warn('[postfx] disabled:', err);
      this.composer = null;
    }
  }

  _build() {
    const { renderer, scene, camera } = this.scene3d;
    const { POSTFX } = this.cfg;

    this.composer = new EffectComposer(renderer, {
      // HalfFloat keeps bloom's bright end from clipping into flat white.
      frameBufferType: HalfFloatType,
      multisampling: Math.min(
        POSTFX.multisampling,
        TIER_PROFILE[this.tier].multisampling
      ),
    });

    this.bloom = new BloomEffect({
      blendFunction: BlendFunction.ADD,
      mipmapBlur: true,
      intensity: POSTFX.bloom.intensity,
      radius: POSTFX.bloom.radius,
      luminanceThreshold: POSTFX.bloom.luminanceThreshold,
      luminanceSmoothing: POSTFX.bloom.luminanceSmoothing,
    });

    this.vignette = new VignetteEffect({
      offset: POSTFX.vignette.offset,
      darkness: POSTFX.vignette.darkness,
    });

    this.composer.addPass(new RenderPass(scene, camera));

    // Ambient occlusion, when the tier can afford the extra geometry pass.
    // Built before the EffectPass so the NormalPass it depends on has already
    // run by the time the merged shader samples it.
    const effects = [];
    if (aoWanted(this.cfg, this.tier)) {
      this.normalPass = new NormalPass(scene, camera, {
        resolutionScale: POSTFX.ao.resolutionScale,
      });
      this.composer.addPass(this.normalPass);
      this.ao = new SSAOEffect(camera, this.normalPass.texture, {
        blendFunction: BlendFunction.MULTIPLY,
        intensity: POSTFX.ao.intensity,
        radius: POSTFX.ao.radius,
        bias: POSTFX.ao.bias,
        resolutionScale: POSTFX.ao.resolutionScale,
        worldDistanceThreshold: 20,
        worldDistanceFalloff: 5,
        worldProximityThreshold: 0.4,
        worldProximityFalloff: 0.1,
      });
      // AO first: it darkens the scene, and bloom should see the darkened
      // result rather than blooming light that AO is about to remove.
      effects.push(this.ao);
    }
    effects.push(this.bloom, this.vignette);

    // One EffectPass = one merged fragment shader for every effect in it.
    this.composer.addPass(new EffectPass(camera, ...effects));

    this.resize();
  }

  /** True only when the chain exists AND is switched on. */
  get active() {
    return this.enabled && !!this.composer;
  }

  setEnabled(on) {
    this.enabled = on && !!this.composer;
  }

  /** Live setters, used by the tuner. */
  set bloomIntensity(v) { if (this.bloom) this.bloom.intensity = v; }
  set bloomRadius(v) { if (this.bloom) this.bloom.mipmapBlurPass.radius = v; }
  set bloomThreshold(v) { if (this.bloom) this.bloom.luminanceMaterial.threshold = v; }
  set bloomSmoothing(v) { if (this.bloom) this.bloom.luminanceMaterial.smoothing = v; }
  set vignetteOffset(v) { if (this.vignette) this.vignette.offset = v; }
  set vignetteDarkness(v) { if (this.vignette) this.vignette.darkness = v; }
  set aoIntensity(v) { if (this.ao) this.ao.intensity = v; }
  set aoRadius(v) { if (this.ao) this.ao.ssaoMaterial.radius = v; }
  set aoBias(v) { if (this.ao) this.ao.ssaoMaterial.bias = v; }

  /** True when AO was actually built (tier allowed it), not merely configured. */
  get hasAO() {
    return !!this.ao;
  }

  values() {
    if (!this.composer) return null;
    const { POSTFX } = this.cfg;
    return {
      intensity: this.bloom.intensity,
      radius: this.bloom.mipmapBlurPass.radius,
      luminanceThreshold: this.bloom.luminanceMaterial.threshold,
      luminanceSmoothing: this.bloom.luminanceMaterial.smoothing,
      offset: this.vignette.offset,
      darkness: this.vignette.darkness,
      aoIntensity: this.ao ? this.ao.intensity : POSTFX.ao.intensity,
      aoRadius: this.ao ? this.ao.ssaoMaterial.radius : POSTFX.ao.radius,
      aoBias: this.ao ? this.ao.ssaoMaterial.bias : POSTFX.ao.bias,
    };
  }

  resize() {
    if (!this.composer) return;
    const { canvas } = this.scene3d;
    // The stage, not the window, is the fallback: the module may sit in a
    // container smaller than the viewport.
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
    // updateStyle=false: the canvas is sized by CSS (sticky stage), and
    // letting the composer write inline width/height would fight the layout.
    this.composer.setSize(w, h, false);
  }

  render(dt) {
    this.composer.render(dt);
  }

  dispose() {
    if (this.composer) this.composer.dispose();
    this.composer = null;
  }
}
