/**
 * Device tiering + adaptive resolution scaling.
 *
 * Two jobs:
 *   1. detectDeviceTier() — a one-time guess at what this device can afford,
 *      used to pick a pixel-ratio cap, MSAA level, and whether post-processing
 *      runs at all.
 *   2. AdaptiveQuality — measures real frame times and scales the render
 *      resolution down (and back up) to hold the target framerate. A phone
 *      that guesses "mid" but thermally throttles still ends up smooth.
 *
 * Resolution scaling is the highest-leverage mobile lever by far: fragment
 * work dominates on tile-based mobile GPUs, and it is proportional to pixel
 * count. Dropping the ratio from 3 to 1.5 is a 4x fragment saving that most
 * readers never notice on a moving 3D shot.
 */

/**
 * Cheap capability probe. Deliberately uses only signals that are stable and
 * widely supported — WEBGL_debug_renderer_info (the GPU name) is masked or
 * removed in most current browsers, so it is not consulted.
 */
export function detectDeviceTier() {
  if (typeof window === 'undefined') return 'high';

  // ?tier=low|mid|high forces the whole pipeline, including the parts the
  // tuner cannot switch live: the renderer's antialias flag, MSAA sample
  // count, and whether the AO normal pass is built at all. This is the only
  // way to actually see what a budget phone gets without owning one.
  const forced = new URLSearchParams(location.search).get('tier');
  if (forced && TIER_PROFILE[forced]) return forced;

  // Coarse pointer + no hover is the reliable "this is a touch device" signal;
  // screen size alone misreads a small laptop window as a phone.
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  const isMobile = coarse && noHover;

  const cores = Number.isFinite(navigator.hardwareConcurrency)
    ? navigator.hardwareConcurrency
    : (isMobile ? 4 : 8);

  // navigator.deviceMemory is a Chromium-only API — Safari and Firefox do not
  // implement it. So it may veto DOWNWARD when it is present and says the
  // device is small, but it must never be *required*: gating on it would pin
  // every iPhone and iPad to the low tier forever, losing the highlight bloom
  // on most mobile readers for a reason that is about API support rather than
  // about the hardware.
  const memKnown = Number.isFinite(navigator.deviceMemory);
  const memory = memKnown ? navigator.deviceMemory : null;

  // WebGL2 absence in 2024+ means a genuinely old or software renderer.
  let webgl2 = false;
  try {
    webgl2 = !!document.createElement('canvas').getContext('webgl2');
  } catch {
    webgl2 = false;
  }

  if (!webgl2 || cores <= 2 || (memKnown && memory <= 2)) return 'low';
  // 6 cores is the modern-phone line (an iPhone 13 reports 6). Anything at or
  // above it gets bloom; the adaptive resolution loop is the real safety net
  // if a given device still cannot hold the framerate.
  if (isMobile) return cores >= 6 && (!memKnown || memory >= 4) ? 'mid' : 'low';
  return cores >= 8 ? 'high' : 'mid';
}

/** Per-tier ceilings. `postfx` is the *budget* — POSTFX.enabled still decides. */
export const TIER_PROFILE = {
  // `ao` is separate from `postfx` because ambient occlusion costs a whole
  // extra geometry pass — a mid-tier phone can afford bloom but not that.
  low: { maxPixelRatio: 1.25, multisampling: 0, postfx: false, ao: false, antialias: false },
  mid: { maxPixelRatio: 1.75, multisampling: 2, postfx: true, ao: false, antialias: true },
  high: { maxPixelRatio: 2.0, multisampling: 4, postfx: true, ao: true, antialias: true },
};

/**
 * Whether the post-processing chain should be built for this tier.
 *
 * Lives here rather than in postfx.js so it stays a pure tier-policy question
 * that scene.js can ask without importing the postprocessing library. It is
 * resolved before the renderer is constructed, because it decides the
 * renderer's `antialias` flag: the composer renders into its own buffers with
 * its own MSAA, so a multisampled default framebuffer would be allocated and
 * never resolved to — real VRAM wasted on the devices least able to spare it.
 */
export function postFXWanted(cfg, tier) {
  const { POSTFX } = cfg;
  return POSTFX.enabled === 'auto' ? TIER_PROFILE[tier].postfx : !!POSTFX.enabled;
}

/** Same question for ambient occlusion, which has its own (stricter) budget. */
export function aoWanted(cfg, tier) {
  const { POSTFX } = cfg;
  if (!postFXWanted(cfg, tier)) return false;
  return POSTFX.ao.enabled === 'auto' ? TIER_PROFILE[tier].ao : !!POSTFX.ao.enabled;
}

/**
 * Resolve the pixel ratio to hand the renderer: the device's own ratio,
 * clamped by the tier ceiling (and the global QUALITY cap), then scaled by
 * the adaptive multiplier.
 *
 * Re-resolved on every resize, because devicePixelRatio genuinely changes —
 * browser zoom, moving a window between a laptop and an external display.
 */
export function resolvePixelRatio(cfg, tier, scale = 1) {
  const { QUALITY } = cfg;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const ceiling = Math.min(TIER_PROFILE[tier].maxPixelRatio, QUALITY.maxPixelRatio);
  return Math.max(QUALITY.minPixelRatio, Math.min(dpr, ceiling) * scale);
}

/**
 * Closed-loop resolution scaler.
 *
 * Watches a rolling window of frame times and nudges a resolution multiplier
 * between QUALITY.minScale and 1. Both directions are deliberately asymmetric:
 * drops are fast and large (the reader is already suffering), recoveries are
 * slow and small (so a single hitch doesn't start an oscillation). A cooldown
 * after every change gives the new resolution time to actually show up in the
 * measurements before the next decision.
 */
export class AdaptiveQuality {
  constructor(scene3d, tier) {
    this.scene3d = scene3d;
    this.cfg = scene3d.cfg;
    const { QUALITY } = this.cfg;
    this.tier = tier;
    this.scale = 1;
    this.enabled = QUALITY.adaptive && tier !== 'high' ? true : QUALITY.adaptive;

    this._frames = [];
    this._cooldown = 0;
    this._sinceCheck = 0;

    // Exposed for the tuner's perf HUD.
    this.fps = 0;
    this.frameMs = 0;
    this.changes = 0;
  }

  /** Manual override from the tuner; disables the closed loop. */
  setScale(scale) {
    this.enabled = false;
    this.scale = scale;
    this.scene3d.applyPixelRatio(this.tier, this.scale);
  }

  /** Hand control back to the closed loop. */
  resume() {
    this.enabled = this.cfg.QUALITY.adaptive;
  }

  /** Call once per rendered frame with the frame's delta in seconds. */
  update(dt) {
    if (dt <= 0) return;
    const { QUALITY } = this.cfg;

    this._frames.push(dt);
    if (this._frames.length > 45) this._frames.shift();

    // Rolling average, reported every frame for the HUD.
    const avg = this._frames.reduce((a, b) => a + b, 0) / this._frames.length;
    this.frameMs = avg * 1000;
    this.fps = 1 / avg;

    if (!this.enabled) return;

    this._cooldown = Math.max(0, this._cooldown - dt);
    this._sinceCheck += dt;
    // Decide at most twice a second, and only on a full measurement window.
    if (this._sinceCheck < 0.5 || this._cooldown > 0 || this._frames.length < 30) return;
    this._sinceCheck = 0;

    const target = QUALITY.targetFps;

    if (this.fps < target * 0.85 && this.scale > QUALITY.minScale) {
      // Struggling: take a real step down, not a nibble.
      this.scale = Math.max(QUALITY.minScale, this.scale - 0.15);
      this._commit();
    } else if (this.fps > target * 1.2 && this.scale < 1) {
      // Comfortable headroom: creep back up.
      this.scale = Math.min(1, this.scale + 0.05);
      this._commit();
    }
  }

  _commit() {
    this.scene3d.applyPixelRatio(this.tier, this.scale);
    this.changes++;
    this._cooldown = 1.5;
    this._frames.length = 0;
  }
}
