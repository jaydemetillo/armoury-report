/**
 * ONE-STOP TUNING CONFIG for the scroll-driven 3D hero module.
 *
 * Everything an engineer needs to retune the experience is in this file:
 *   - CAMERA_KEYFRAMES : where the camera sits at each point of scroll progress
 *   - STEPS            : the story beats (highlight region + card copy)
 *   - MOTION           : damping / feel constants
 *   - HIGHLIGHT        : the green glow look
 *   - SCROLL           : scroll-section heights and ScrollTrigger ranges
 *
 * The tuner's "Copy …" buttons emit these exact blocks, so paste them back
 * over the matching block here. Every mount gets its own deep copy (see
 * resolveConfig at the bottom), and mountHero3D(container, { config }) can
 * override any block per mount without editing this file.
 *
 * Coordinate conventions
 * ----------------------
 * The model is auto-centered at the world origin after load (see scene.js).
 * Camera position is spherical around that origin:
 *   azimuth   0° = front of the model (+Z), 90° = its right side (+X),
 *             180° = back (-Z), 270° = its left side (-X).
 *   polar     elevation above the horizon, degrees.
 *   zoom      multiplier on the auto-framed orbit radius. Keep within
 *             ~0.94–1.06 so the model never "breaks distance" or clips.
 *
 * Highlight regions are expressed in normalized bounding-box space [0..1]
 * per axis (x: 0 = -X face … 1 = +X face, same for y/z), so the exact same
 * config works on ANY swapped-in GLB regardless of its real-world size.
 * Regions are soft-edged BOXES: `center` positions them, `size` is their
 * full extent per axis as a fraction of the model's bounding box.
 */

/**
 * One-time correction for the source model's authoring orientation, applied
 * before anything is measured. The camera convention needs the front of the
 * vehicle on +Z; the Meshy export faces -X, so spin it 90° about Y.
 */
export const MODEL_TRANSFORM = { rotationY: 90 };

/**
 * 'clay'     NYT-style editorial look: textures stripped, neutral matte
 *            material, contact shadow. The green annotation does the talking.
 * 'textured' the model's own texture maps. The served GLB is texture-free,
 *            so re-pack from a textured source first:
 *            npm run optimize:model -- path/to/textured-export.glb
 */
export const RENDER_MODE = 'clay';

export const CLAY = {
  color: 0xdcdcdf,   // neutral clay
  metalness: 0.05,
  roughness: 0.65,
};

export const CAMERA_SETTINGS = {
  // Global multiplier on the auto-framed orbit distance. 1.0 frames the whole
  // model with margin; lower = closer crop. Kept moderate — very close crops
  // magnify the scanned mesh's surface noise.
  distanceScale: 0.85,

  /**
   * Where the model sits ON THE CANVAS, per screen size, without changing the
   * orbit angle. Author these with the tuner — pick a device in Mobile tester
   * and the Camera panel switches to the matching profile automatically.
   *
   * `offset` is [x, y] as a fraction of the viewport: [0.15, 0] puts the model
   * 15% of the viewport width right of centre, [0, -0.1] drops it 10% of the
   * height. `zoom` multiplies the framing distance — above 1 pulls back.
   *
   * Implemented as a camera truck: the camera and its look target move
   * together, perpendicular to the view, so the model holds the SAME spot on
   * screen at every azimuth. Translating the model in world space instead
   * would make it swim across the frame as the camera orbits — pushed right at
   * the front, centred from the side, pushed left from the back. Because both
   * ends of the view move by the same vector, the framing shifts but nothing
   * about the orbit, the distance or the highlight maths changes.
   *
   * Both values stack ON TOP of the automatic corrections below (narrowCrop,
   * cardClearance) rather than replacing them, so those keep guaranteeing that
   * nothing is clipped and the story card never covers the model. These are
   * composition on top of a frame that is already safe.
   */
  framing: {
    /**
     * A viewport is "compact" when EITHER dimension is small — that catches a
     * phone in both orientations, where a width-only test would send a
     * sideways phone (844px wide) to the desktop profile.
     *
     * Measured against the CANVAS, not the window, which is what makes the
     * tuner's device preview work: it resizes the stage while the window stays
     * put, so keying off the window would leave you editing the desktop
     * profile while previewing a phone.
     */
    compactBelowWidth: 700,
    compactBelowHeight: 500,
    desktop: { offset: [0, 0], zoom: 1 },
    mobile: { offset: [0, 0], zoom: 1 },
  },

  /**
   * Portrait rescue. `distanceScale` is a deliberately tight crop, and a wide
   * desktop viewport absorbs it — but a portrait phone does not: the side-on
   * beats measure 2–9% of the appliance past the screen edge, cutting off its
   * nose and tail.
   *
   * Below `belowAspect`, the crop eases out toward `minScale` in proportion to
   * how narrow the viewport is. At or above that aspect nothing changes at
   * all, so the desktop framing is untouched.
   *
   * Set `minScale` equal to `distanceScale` to disable and keep the tight crop
   * everywhere.
   */
  narrowCrop: {
    // Measured, not guessed: the crop is WORST at a square viewport (~11% of
    // the model off-screen at 1:1), not at the narrowest one. Below aspect 1
    // framedRadius() starts growing as the horizontal fov closes in, which
    // partly self-corrects; above it there is spare width. So the correction
    // has to start in landscape (1.3) and be at full strength by 1.0, rather
    // than starting at portrait.
    belowAspect: 1.3,
    fullyByAspect: 1.0,
    /**
     * Floor for the crop multiplier once the ramp is at full strength.
     *
     * Above 1.0 means "further out than the auto-framed fit" — deliberately.
     * 0.97 merely stopped the model being clipped, which still read as
     * edge-to-edge with ~4% of space around it; 1.10 leaves ~16%, against
     * ~25% on a landscape desktop. Because framedRadius() already folds in
     * the viewport's own aspect, one value produces the SAME relative margin
     * on every handset: a narrower phone is automatically pulled back further
     * in world units.
     */
    minScale: 1.1,
  },

  /**
   * Lift the model clear of the story card on short landscape viewports.
   *
   * A phone held sideways gives ~390px of height, and the card alone is ~208
   * of it — 53%. With the model vertically centred the card lands straight on
   * top of it. Portrait is unaffected: there the card sits at the bottom with
   * the model comfortably above it.
   *
   * The fix is a VERTICAL framing offset rather than a horizontal one or a
   * zoom-out. The card spans nearly half the width, so sliding the model
   * sideways cannot clear it without pushing it off the opposite edge, and
   * zooming out enough would leave the subject tiny. But the appliance is
   * short in Y even when it fills the frame in X, so a modest lift moves it
   * entirely above the card at full size.
   *
   * Only applies when the viewport is landscape AND short; it ramps in so
   * rotating a device does not pop.
   */
  cardClearance: {
    // Measured against the desktop baseline rather than picked: the card is a
    // fixed ~208px tall, so the shorter the stage the higher its top edge sits
    // in normalised space and the more of the model it swallows. A 1440x900
    // window overlaps the model's box by 0.073 and looks right, so that is the
    // target; a 1133x744 iPad in landscape was at 0.382 and a phone at 0.888.
    // The ramp is set so 744 lands near the desktop figure and 900 is exactly
    // untouched.
    belowHeight: 900,
    fullyByHeight: 590,
    offsetY: 0.3,
    // The lift alone would push the model off the TOP of a 390px-tall stage,
    // so it is paired with a small step back. Together they clear the card
    // while keeping the whole appliance on screen.
    minScale: 0.97,
  },
};

export const CAMERA_KEYFRAMES = [
  // p = overall scroll progress through the scrolly section (0..1).
  // Segment plan (4 x 100vh): right side -> back -> left side -> settle.
  { p: 0.0,  azimuth: 78,  polar: 11, zoom: 1.04 }, // takeover: right-front
  { p: 0.2,  azimuth: 96,  polar: 13, zoom: 0.97 }, // dwell on the right side
  { p: 0.34, azimuth: 176, polar: 19, zoom: 1.12 }, // sweep to the back
  { p: 0.52, azimuth: 186, polar: 15, zoom: 1.2  }, // dwell on the back (end-on
                                                    // views need extra distance
                                                    // with the closer global crop)
  { p: 0.68, azimuth: 266, polar: 13, zoom: 1.1  }, // sweep to the left side
  { p: 0.84, azimuth: 274, polar: 11, zoom: 0.98 }, // dwell on the left side
  { p: 1.0,  azimuth: 274, polar: 11, zoom: 1.0  }, // hold: no more rotation,
                                                    // page releases to normal scroll
];

// Card copy is intentionally empty: fill kicker/title/body to show a card for
// a beat. A beat with all three empty keeps its highlight and timing but
// shows no card.
export const STEPS = [
  {
    id: 'right-side',
    // active while damped progress is inside [start, end)
    start: 0.0,
    end: 0.3,
    region: { center: [0.85, 0.45, 0.31], size: [0.02, 0.6, 0.48] },
    kicker: '',
    title: '',
    body: '',
  },
  {
    id: 'rear',
    start: 0.3,
    end: 0.62,
    region: { center: [0.46, 0.44, 0], size: [0.54, 0.6, 0.02] },
    kicker: '',
    title: '',
    body: '',
  },
  {
    id: 'left-side',
    start: 0.62,
    end: 0.88,
    region: { center: [0.12, 0.41, 0.31], size: [0.02, 0.6, 0.49] },
    kicker: '',
    title: '',
    body: '',
  },
  // After the last step (p >= 0.88) all highlights fade out, the camera
  // stops rotating, and the reader scrolls off the pinned stage normally.
];

export const MOTION = {
  // Exponential damping factor applied to raw scroll progress each frame.
  // Higher = snappier tracking of the wheel; lower = floatier, smoother.
  progressDamping: 3.2,
  // Seconds for the green highlight to fade in / out on step changes.
  highlightFadeIn: 0.7,
  highlightFadeOut: 0.45,
  // Seconds for a story card to enter / leave.
  cardIn: 0.6,
  cardOut: 0.35,
};

export const HIGHLIGHT = {
  color: 0x0055ff,
  opacity: 0.5,
  tintStrength: 0.5,
  emissiveBoost: 0.9,
  dimLevel: 0.45,
  edgeFeather: 0.1,
};

/**
 * Post-processing (src/postfx.js). The bloom is thresholded, so it only picks
 * up the emissive boost the highlight shader adds to the focused region —
 * below the threshold the clay render is untouched. Set `intensity: 0` to
 * keep the chain alive but invisible; set `enabled: false` to skip it wholly.
 *
 * enabled: 'auto' runs it on the mid/high device tiers and skips it on low
 *          (see TIER_PROFILE in quality.js). true/false force the decision.
 */
export const POSTFX = {
  enabled: 'auto',
  // MSAA samples for the composer's buffers. Clamped down by device tier;
  // 0 disables it. This replaces the renderer's own antialias when the
  // composer is active, which is why it is not simply left at 0.
  multisampling: 4,
  bloom: {
    intensity: 0.85,
    // Raise to bloom less of the model, lower to bloom more. The clay body
    // sits well under 0.7 after tone mapping; the highlight's glow exceeds it.
    luminanceThreshold: 0.72,
    luminanceSmoothing: 0.08,
    radius: 0.72,
  },
  vignette: {
    offset: 0.32,
    darkness: 0.42,
  },
  /**
   * Screen-space ambient occlusion. On an untextured clay model this is the
   * single biggest readability win — it puts contact shading into every
   * crevice, which is what makes a diagram read as a solid object rather than
   * a flat silhouette.
   *
   * It is also the most expensive thing here: it needs a NormalPass, i.e. a
   * SECOND full geometry pass over ~1.5M triangles. That is why 'auto' means
   * high tier only, and why resolutionScale defaults to half — AO is low
   * frequency, so half-res is visually free and quarters the sampling cost.
   */
  ao: {
    enabled: 'auto',
    intensity: 1.7,
    radius: 0.09,
    bias: 0.03,
    resolutionScale: 0.5,
  },
};

/**
 * Mobile / performance budget (src/quality.js).
 *
 * Pixel ratio is the single biggest lever on phones: fragment shading
 * dominates on tile-based GPUs and scales with pixel count, so a 3x-DPR
 * phone rendering at 1.25 is doing ~6x less fragment work than at 3.
 * `adaptive` adds a closed loop on top — it measures real frame times and
 * scales resolution until the target framerate holds, which also covers
 * thermal throttling that no static device check can predict.
 */
export const QUALITY = {
  // Hard ceiling across all tiers; the per-tier caps in quality.js can only
  // lower it further. Above 2 there is essentially nothing left to see.
  maxPixelRatio: 2,
  // Floor for the adaptive loop, as an absolute pixel ratio.
  minPixelRatio: 0.75,
  adaptive: true,
  targetFps: 50,
  // Lowest multiplier the adaptive loop may apply to the tier's cap.
  minScale: 0.6,
  // Stop rendering entirely when the tab is backgrounded. The
  // IntersectionObserver in scrolly.js already handles off-screen; this
  // covers tab switches, which on mobile is where the battery actually goes.
  pauseWhenHidden: true,
};

// Where the GLB is fetched from. Override per mount with
// mountHero3D(container, { modelUrl }) when the site is not served from /.
export const MODEL_URL = '/models/model.glb';

/**
 * Scroll structure and triggers (src/modules/hero3d/scrolly.js).
 *
 * The module's root is as tall as the sum of `sections` — one viewport per
 * story beat plus one release beat, exactly the original 400svh. The stage
 * is position: sticky inside it, so it holds the viewport while progress
 * advances. Every trigger references the module's own root element, never a
 * page position, so the module can be moved anywhere on any page.
 */
export const SCROLL = {
  // Placeholder scroll sections, in order. Their heights ARE the scroll
  // distance; the labels are only for reading the DOM. svh with a vh
  // fallback, so mobile toolbars collapsing mid-scroll don't make the stage jump.
  sections: [
    { label: 'Section 1: takeover, then the right side (p 0.00–0.33)', height: '100svh', fallback: '100vh' },
    { label: 'Section 2: sweep to the back, dwell on the rear (p 0.33–0.67)', height: '100svh', fallback: '100vh' },
    { label: 'Section 3: sweep to the left side and dwell (p 0.67–1.00)', height: '100svh', fallback: '100vh' },
    { label: 'Section 4: release, the stage scrolls away (p = 1)', height: '100svh', fallback: '100vh' },
  ],
  // Main scrub: module progress 0..1 -> camera rig target progress.
  main: { start: 'top top', end: 'bottom bottom', scrub: true },
  // Takeover pre-roll: the stage grows from an inset figure to full-bleed as
  // it scrolls into place. Skipped under prefers-reduced-motion.
  takeover: {
    start: 'top 90%',
    end: 'top top',
    scrub: true,
    from: { scale: 0.94, opacity: 0.35, borderRadius: '14px' },
    to: { scale: 1, opacity: 1, borderRadius: '0px', ease: 'none' },
  },
  // Only render while the module is within this margin of the viewport.
  renderRootMargin: '60% 0px 60% 0px',
};

/** Every block above, as the single object the module reads from. */
export const HERO3D_CONFIG = {
  MODEL_TRANSFORM,
  RENDER_MODE,
  CLAY,
  CAMERA_SETTINGS,
  CAMERA_KEYFRAMES,
  STEPS,
  MOTION,
  HIGHLIGHT,
  POSTFX,
  QUALITY,
  MODEL_URL,
  SCROLL,
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function merge(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) return override;
  const out = { ...base };
  for (const [k, v] of Object.entries(override)) out[k] = merge(base[k], v);
  return out;
}

/**
 * A private deep copy of HERO3D_CONFIG with per-mount overrides merged in.
 * Objects merge key by key; arrays (keyframes, steps, sections) replace
 * wholesale. The tuner edits this copy live, so tuning one mount never leaks
 * into another, and a remount starts from the file again.
 */
export function resolveConfig(overrides = {}) {
  return structuredClone(merge(HERO3D_CONFIG, overrides));
}
