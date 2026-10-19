import * as THREE from 'three';
import { FreeLook } from './cameraControls.js';
import { TIER_PROFILE } from './quality.js';

/**
 * DEV-ONLY visual tuner. Loaded on demand by index.js (the `tuner` option,
 * ?tune, or the Alt+Shift+T hotkey), so none of this ships in the normal
 * bundle — and neither does camera-controls, which is imported only from here.
 *
 * What it gives you:
 *   - click anywhere on the model to move the highlight there
 *   - sliders for the highlight box size, edge softness and look
 *   - a wireframe outline showing exactly where the box is
 *   - free-look orbit (camera-controls) that inverts back into a keyframe line
 *   - live bloom / vignette controls
 *   - a performance HUD with adaptive-resolution state and a tier preview
 *   - copy-paste-ready snippets for config.js
 *
 * It edits the running scene directly; nothing is persisted. When something
 * looks right, copy the snippet into config.js to make it permanent.
 *
 * `dbg` is the instance handle from scrolly.js. Returns a dispose function
 * that removes the panel, listeners, timers and helper geometry.
 */
export function initTuner(dbg, { storageKey = 'threejs-tuner-v1' } = {}) {
  if (!dbg) return () => {};
  const { POSTFX, CAMERA_SETTINGS, CAMERA_KEYFRAMES } = dbg.scene3d.cfg;

  const { scene3d, highlighter, rig, steps, control, postfx, quality } = dbg;
  const bounds = scene3d.bounds;
  const size = bounds.getSize(new THREE.Vector3());

  // Working copy of each step's region, so edits are live but non-destructive.
  const regions = steps.map((s) => ({
    id: s.id,
    kicker: s.kicker || s.id,
    center: [...s.region.center],
    size: [...s.region.size],
  }));
  let active = 0;
  let frozen = false;

  // ------------------------------------------------------------- persistence
  // Tuner-only: nothing here runs on the normal page. Restoring happens before
  // any UI is built, so every control below reads back the saved value rather
  // than the config.js default.
  const STORE_KEY = storageKey;
  const OFF_KEY = `${STORE_KEY}:off`;
  let persistOn = localStorage.getItem(OFF_KEY) !== '1';

  function loadState() {
    if (!persistOn) return null;
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    } catch {
      return null; // corrupt entry should never break the tuner
    }
  }

  const saved = loadState();
  if (saved) {
    try {
      // Regions are per-step and matched by id, so adding or reordering steps
      // in config.js cannot smear one step's box onto another.
      for (const r of saved.regions || []) {
        const target = regions.find((x) => x.id === r.id);
        if (target && r.center?.length === 3 && r.size?.length === 3) {
          target.center = [...r.center];
          target.size = [...r.size];
        }
      }
      const u = highlighter.uniforms;
      const L = saved.look;
      if (L) {
        if (L.color) u.uFocusColor.value.set(L.color);
        if (Number.isFinite(L.opacity)) u.uFocusOpacity.value = L.opacity;
        if (Number.isFinite(L.tint)) u.uTintStrength.value = L.tint;
        if (Number.isFinite(L.glow)) u.uEmissiveBoost.value = L.glow;
        if (Number.isFinite(L.dim)) u.uDimLevel.value = L.dim;
      }
      if (saved.camera) {
        const c = saved.camera;
        if (Number.isFinite(c.distanceScale)) CAMERA_SETTINGS.distanceScale = c.distanceScale;
        // Restore each framing profile independently, so a saved mobile
        // composition survives even if only desktop was touched since.
        for (const key of ['desktop', 'mobile']) {
          const src = c.framing?.[key];
          const dst = CAMERA_SETTINGS.framing?.[key];
          if (!src || !dst) continue;
          if (src.offset?.length === 2 && src.offset.every(Number.isFinite)) {
            dst.offset[0] = src.offset[0];
            dst.offset[1] = src.offset[1];
          }
          if (Number.isFinite(src.zoom)) dst.zoom = src.zoom;
        }
      }
      // Splice rather than reassign: cameraRig.js reads this same array.
      if (Array.isArray(saved.keyframes) && saved.keyframes.length >= 2) {
        const ok = saved.keyframes.every((k) =>
          ['p', 'azimuth', 'polar', 'zoom'].every((f) => Number.isFinite(k[f])));
        if (ok) {
          CAMERA_KEYFRAMES.splice(0, CAMERA_KEYFRAMES.length,
            ...saved.keyframes.map((k) => ({ ...k })).sort((a, b) => a.p - b.p));
        }
      }
      if (saved.postfx && postfx && postfx.composer) {
        const f = saved.postfx;
        if (Number.isFinite(f.intensity)) postfx.bloomIntensity = f.intensity;
        if (Number.isFinite(f.radius)) postfx.bloomRadius = f.radius;
        if (Number.isFinite(f.luminanceThreshold)) postfx.bloomThreshold = f.luminanceThreshold;
        if (Number.isFinite(f.luminanceSmoothing)) postfx.bloomSmoothing = f.luminanceSmoothing;
        if (Number.isFinite(f.offset)) postfx.vignetteOffset = f.offset;
        if (Number.isFinite(f.darkness)) postfx.vignetteDarkness = f.darkness;
        if (Number.isFinite(f.aoIntensity)) postfx.aoIntensity = f.aoIntensity;
        if (Number.isFinite(f.aoRadius)) postfx.aoRadius = f.aoRadius;
        if (Number.isFinite(f.aoBias)) postfx.aoBias = f.aoBias;
      }
    } catch (err) {
      console.warn('[tuner] could not restore saved edits:', err);
    }
  }

  let saveTimer = 0;
  function saveState() {
    if (!persistOn) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        regions: regions.map((r) => ({ id: r.id, center: r.center, size: r.size })),
        look: {
          color: '#' + highlighter.uniforms.uFocusColor.value.getHexString(),
          opacity: highlighter.uniforms.uFocusOpacity.value,
          tint: highlighter.uniforms.uTintStrength.value,
          glow: highlighter.uniforms.uEmissiveBoost.value,
          dim: highlighter.uniforms.uDimLevel.value,
          edgeFeather: featherFrac,
        },
        camera: {
          distanceScale: CAMERA_SETTINGS.distanceScale,
          framing: {
            desktop: {
              offset: [...CAMERA_SETTINGS.framing.desktop.offset],
              zoom: CAMERA_SETTINGS.framing.desktop.zoom,
            },
            mobile: {
              offset: [...CAMERA_SETTINGS.framing.mobile.offset],
              zoom: CAMERA_SETTINGS.framing.mobile.zoom,
            },
          },
        },
        keyframes: CAMERA_KEYFRAMES.map((k) => ({ ...k })),
        postfx: postfx && postfx.composer ? postfx.values() : null,
      }));
    } catch (err) {
      console.warn('[tuner] could not save edits:', err);
    }
  }
  // Debounced: slider drags fire continuously and localStorage is synchronous.
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 400);
  };

  // ---------------------------------------------------------------- wireframe
  const boxHelper = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0x2fbf71, depthTest: false })
  );
  boxHelper.renderOrder = 999;
  scene3d.scene.add(boxHelper);

  function syncScene() {
    const r = regions[active];
    highlighter.applyRegion(r);
    // Mirror the region onto the wireframe.
    boxHelper.position.copy(scene3d.normalizedToWorld(r.center));
    boxHelper.scale.set(size.x * r.size[0], size.y * r.size[1], size.z * r.size[2]);
    // Force the highlight fully on so placement is always visible.
    highlighter.uniforms.uFocusStrength.value = 1;
    highlighter.uniforms.uDimStrength.value = 1;
    render();
  }

  // ------------------------------------------------------------- free-look rig
  // Suspends the scroll rig while active so the two never fight over
  // camera.position; see src/cameraControls.js.
  const freeLook = new FreeLook(scene3d, control, rig);
  // Expose it alongside the rest of the debug handle, so the free-look rig can
  // be driven from the console (and from the verification scripts).
  dbg.freeLook = freeLook;
  control.onFrame = (dt) => {
    if (freeLook.enabled && freeLook.update(dt)) render();
  };

  // ------------------------------------------------------------- click-to-place
  const raycaster = new THREE.Raycaster();
  const onPointerDown = (e) => {
    // With free-look on, a bare drag is an orbit — require shift to place.
    if (freeLook.enabled && !e.shiftKey) return;
    if (!e.shiftKey && !placeMode.checked) return;
    const rect = scene3d.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, scene3d.camera);
    const hit = raycaster.intersectObject(scene3d.model, true)[0];
    if (!hit) return;
    // World hit point -> normalized bounding-box coords.
    const r = regions[active];
    r.center = [
      (hit.point.x - bounds.min.x) / size.x,
      (hit.point.y - bounds.min.y) / size.y,
      (hit.point.z - bounds.min.z) / size.z,
    ].map((v) => Math.min(1, Math.max(0, v)));
    refreshInputs();
    syncScene();
    scheduleSave(); // canvas clicks are outside the panel's listeners
  };
  scene3d.canvas.addEventListener('pointerdown', onPointerDown);

  // -------------------------------------------------------------------- panel
  const panel = document.createElement('div');
  panel.className = 'h3d-tuner';
  panel.innerHTML = `
    <style>
      .h3d-tuner {
        position: fixed; top: 12px; right: 12px; z-index: 9999;
        width: 296px; max-height: calc(100vh - 24px); overflow-y: auto;
        background: rgba(18, 20, 24, 0.94); color: #e8e8ea;
        font: 12px/1.45 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        border: 1px solid #33363d; border-radius: 8px; padding: 12px 13px 14px;
        backdrop-filter: blur(8px);
      }
      .h3d-tuner h2 { font-size: 11px; letter-spacing: .12em; text-transform: uppercase;
        color: #2fbf71; margin: 0; }
      /* Header stays put when the body is collapsed away. */
      .h3d-tuner__bar { display: flex; align-items: center; justify-content: space-between;
        gap: 10px; margin-bottom: 8px; }
      .h3d-tuner__bar button { flex: 0 0 22px; width: 22px; height: 22px; padding: 0;
        font-size: 15px; line-height: 1; display: flex; align-items: center;
        justify-content: center; }
      .h3d-tuner.is-min { width: auto; }
      .h3d-tuner.is-min .h3d-tuner__bar { margin-bottom: 0; }
      .h3d-tuner.is-min .h3d-tuner__body { display: none; }
      .h3d-tuner details { border-top: 1px solid #26292f; margin-top: 10px; }
      .h3d-tuner details[open] { padding-bottom: 4px; }
      .h3d-tuner summary { font-size: 10px; letter-spacing: .1em; text-transform: uppercase;
        color: #8b8f98; margin: 10px 0 6px; font-weight: 600; cursor: pointer;
        list-style: none; display: flex; align-items: center; gap: 6px; }
      .h3d-tuner summary::-webkit-details-marker { display: none; }
      .h3d-tuner summary::before { content: '▸'; font-size: 9px; transition: transform .15s; }
      .h3d-tuner details[open] > summary::before { transform: rotate(90deg); }
      .h3d-tuner label { display: flex; align-items: center; gap: 8px; margin: 5px 0; }
      .h3d-tuner label span:first-child { flex: 0 0 62px; color: #b9bcc3; }
      .h3d-tuner input[type=range] { flex: 1; min-width: 0; accent-color: #2fbf71; }
      .h3d-tuner .val { flex: 0 0 34px; text-align: right;
        font-variant-numeric: tabular-nums; color: #e8e8ea; }
      .h3d-tuner select, .h3d-tuner button {
        width: 100%; background: #23262c; color: #e8e8ea; border: 1px solid #3a3e46;
        border-radius: 5px; padding: 6px 8px; font: inherit; cursor: pointer;
      }
      .h3d-tuner button:hover { background: #2c3038; border-color: #2fbf71; }
      .h3d-tuner button:disabled { opacity: .45; cursor: not-allowed; }
      .h3d-tuner .row { display: flex; gap: 6px; }
      .h3d-tuner .check { display: flex; align-items: center; gap: 7px; margin: 7px 0;
        color: #b9bcc3; cursor: pointer; }
      .h3d-tuner pre {
        background: #0e1013; border: 1px solid #2a2d34; border-radius: 5px;
        padding: 8px; margin: 6px 0 0; font-size: 10.5px; line-height: 1.5;
        white-space: pre-wrap; word-break: break-all; color: #a8e6c4;
      }
      .h3d-tuner .hint { color: #7d818a; font-size: 10.5px; margin: 6px 0 0; }
      .h3d-tuner .ok { color: #2fbf71; }
      .h3d-tuner .warn { color: #e8b339; font-size: 10.5px; margin: 6px 0 0; }
      .h3d-tuner .stats { display: grid; grid-template-columns: 1fr auto; gap: 1px 8px;
        font-size: 11px; margin: 4px 0 0; }
      .h3d-tuner .stats dt { color: #8b8f98; }
      .h3d-tuner .stats dd { margin: 0; text-align: right; color: #e8e8ea;
        font-variant-numeric: tabular-nums; }
      .h3d-tuner .stats dd.good { color: #2fbf71; }
      .h3d-tuner .stats dd.bad { color: #e8733f; }
      .h3d-tuner .pill { font-size: 10px; letter-spacing: .08em; text-transform: uppercase;
        background: #1d3a2a; color: #2fbf71; border: 1px solid #2f6b4c;
        border-radius: 999px; padding: 2px 8px; font-weight: 600; }
      /* Segmented Desktop/Mobile switch — the active half is unmistakable, so
         which profile you are editing never has to be inferred. */
      .h3d-tuner .seg { display: flex; gap: 0; margin: 6px 0 0; }
      .h3d-tuner .seg__btn { flex: 1; border-radius: 0; font-weight: 600;
        border-color: #3a3e46; background: #1b1e23; color: #9aa0a8; }
      .h3d-tuner .seg__btn:first-child { border-radius: 5px 0 0 5px; }
      .h3d-tuner .seg__btn:last-child { border-radius: 0 5px 5px 0; border-left: none; }
      .h3d-tuner .seg__btn.is-active { background: #1d3a2a; color: #7ff0b0;
        border-color: #2fbf71; }
      .h3d-tuner .seg__btn.is-active:hover { background: #22462f; }
    </style>

    <div class="h3d-tuner__bar">
      <h2>Three.js tuner</h2>
      <button id="tn-min" title="Minimize panel" aria-label="Minimize panel">–</button>
    </div>

    <div class="h3d-tuner__body">
    <select id="tn-step"></select>
    <label class="check"><input type="checkbox" id="tn-place" checked>
      Click model to place green</label>
    <label class="check"><input type="checkbox" id="tn-freeze">
      Freeze scroll sequencing</label>
    <label class="check"><input type="checkbox" id="tn-wire" checked>
      Show box outline</label>

    <details open>
      <summary>Box size</summary>
      <label><span>Width</span><input type="range" id="tn-sx" min="0.02" max="1.2" step="0.01"><span class="val" id="tn-sx-v"></span></label>
      <label><span>Height</span><input type="range" id="tn-sy" min="0.02" max="1.2" step="0.01"><span class="val" id="tn-sy-v"></span></label>
      <label><span>Depth</span><input type="range" id="tn-sz" min="0.02" max="1.2" step="0.01"><span class="val" id="tn-sz-v"></span></label>
    </details>

    <details open>
      <summary>Position (or click the model)</summary>
      <label><span>Left/right</span><input type="range" id="tn-cx" min="0" max="1" step="0.01"><span class="val" id="tn-cx-v"></span></label>
      <label><span>Up/down</span><input type="range" id="tn-cy" min="0" max="1" step="0.01"><span class="val" id="tn-cy-v"></span></label>
      <label><span>Front/back</span><input type="range" id="tn-cz" min="0" max="1" step="0.01"><span class="val" id="tn-cz-v"></span></label>
    </details>

    <details open>
      <summary>Look</summary>
      <label><span>Color</span>
        <input type="color" id="tn-color" style="flex:0 0 34px;height:24px;padding:1px;border:1px solid #3a3e46;border-radius:4px;background:#23262c;cursor:pointer">
        <input type="text" id="tn-hex" spellcheck="false" maxlength="7"
          style="flex:1;min-width:0;background:#23262c;color:#e8e8ea;border:1px solid #3a3e46;border-radius:4px;padding:4px 6px;font:inherit;font-variant-numeric:tabular-nums">
      </label>
      <label><span>Opacity</span><input type="range" id="tn-opacity" min="0" max="100" step="1"><span class="val" id="tn-opacity-v"></span></label>
      <label><span>Feather</span><input type="range" id="tn-feather" min="0" max="0.4" step="0.01"><span class="val" id="tn-feather-v"></span></label>
      <label><span>Tint</span><input type="range" id="tn-tint" min="0" max="1" step="0.05"><span class="val" id="tn-tint-v"></span></label>
      <label><span>Glow</span><input type="range" id="tn-glow" min="0" max="2.5" step="0.05"><span class="val" id="tn-glow-v"></span></label>
      <label><span>Dim rest</span><input type="range" id="tn-dim" min="0" max="1" step="0.05"><span class="val" id="tn-dim-v"></span></label>
    </details>

    <details open>
      <summary>Camera</summary>
      <label class="check"><input type="checkbox" id="tn-free">
        Free look (drag / scroll to orbit)</label>
      <pre id="tn-cam"></pre>
      <p class="warn" id="tn-drift" style="display:none"></p>
      <div class="row" style="margin-top:6px">
        <button id="tn-recenter">Recenter target</button>
        <button id="tn-camcopy">Copy keyframe</button>
      </div>
      <p class="hint">Scroll the page to pick <b>p</b>, free-look to pick the
        angle, then copy. The azimuth is unwrapped to continue the existing
        track rather than snapping back through 0°.</p>

      <span style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8b8f98">Model on canvas</span>
      <div class="seg">
        <button id="tn-prof-desktop" class="seg__btn">🖥 Desktop</button>
        <button id="tn-prof-mobile" class="seg__btn">📱 Mobile</button>
      </div>
      <p class="hint" id="tn-profile-note" style="margin:5px 0 2px"></p>
      <label><span>Model X</span><input type="range" id="tn-fox" min="-0.5" max="0.5" step="0.01"><span class="val" id="tn-fox-v"></span></label>
      <label><span>Model Y</span><input type="range" id="tn-foy" min="-0.5" max="0.5" step="0.01"><span class="val" id="tn-foy-v"></span></label>
      <label><span>Zoom</span><input type="range" id="tn-fzoom" min="0.6" max="1.6" step="0.01"><span class="val" id="tn-fzoom-v"></span></label>
      <p class="warn" id="tn-offscreen" style="display:none"></p>
      <span style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8b8f98">All screens</span>
      <label><span>Distance</span><input type="range" id="tn-dist" min="0.5" max="1.6" step="0.01"><span class="val" id="tn-dist-v"></span></label>
      <pre id="tn-camset"></pre>
      <div class="row" style="margin-top:6px">
        <button id="tn-framereset">Reset this profile</button>
        <button id="tn-camsetcopy">Copy CAMERA_SETTINGS</button>
      </div>
      <p class="hint">The three sliders edit whichever profile is highlighted
        above. The toggle resizes the stage too, so you are always looking at
        the frame you are editing. Copy emits both profiles. They stack on top
        of the automatic mobile corrections, so you are nudging a frame that is
        already safe.</p>
    </details>

    <details>
      <summary>Keyframes</summary>
      <select id="tn-kf"></select>
      <label><span>At p</span><input type="range" id="tn-kfp" min="0" max="1" step="0.01"><span class="val" id="tn-kfp-v"></span></label>
      <div class="row" style="margin-top:6px">
        <button id="tn-kfjump">Go to</button>
        <button id="tn-kfset">Set from camera</button>
      </div>
      <div class="row" style="margin-top:6px">
        <button id="tn-kfadd">Insert here</button>
        <button id="tn-kfdel">Delete</button>
      </div>
      <p class="warn" id="tn-kfwarn" style="display:none"></p>
      <pre id="tn-kfout"></pre>
      <button id="tn-kfcopy">Copy CAMERA_KEYFRAMES</button>
      <p class="hint"><b>Go to</b> scrolls the page to that beat.
        <b>Set from camera</b> overwrites its angle with wherever you are now —
        turn on Free look first. Edits are live, so scroll back through to
        check the move before copying.</p>
    </details>

    <details>
      <summary>Post FX</summary>
      <div id="tn-fx-body">
        <label class="check"><input type="checkbox" id="tn-fx-on">
          Enable post-processing</label>
        <label><span>Bloom</span><input type="range" id="tn-bloom" min="0" max="3" step="0.05"><span class="val" id="tn-bloom-v"></span></label>
        <label><span>Threshold</span><input type="range" id="tn-thresh" min="0" max="1.2" step="0.01"><span class="val" id="tn-thresh-v"></span></label>
        <label><span>Smoothing</span><input type="range" id="tn-smooth" min="0" max="0.5" step="0.01"><span class="val" id="tn-smooth-v"></span></label>
        <label><span>Radius</span><input type="range" id="tn-radius" min="0" max="1" step="0.01"><span class="val" id="tn-radius-v"></span></label>
        <label><span>Vig offset</span><input type="range" id="tn-vigo" min="0" max="1" step="0.01"><span class="val" id="tn-vigo-v"></span></label>
        <label><span>Vig dark</span><input type="range" id="tn-vigd" min="0" max="1.5" step="0.01"><span class="val" id="tn-vigd-v"></span></label>
        <div id="tn-ao-body">
          <span style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8b8f98">Ambient occlusion</span>
          <label><span>AO amount</span><input type="range" id="tn-aoi" min="0" max="4" step="0.05"><span class="val" id="tn-aoi-v"></span></label>
          <label><span>AO radius</span><input type="range" id="tn-aor" min="0.01" max="0.4" step="0.01"><span class="val" id="tn-aor-v"></span></label>
          <label><span>AO bias</span><input type="range" id="tn-aob" min="0" max="0.15" step="0.005"><span class="val" id="tn-aob-v"></span></label>
        </div>
        <p class="hint" id="tn-ao-off" style="display:none">AO is off on this
          tier — it needs a second geometry pass. Reload with
          <b>?tier=high</b> to see it.</p>
        <pre id="tn-fxout"></pre>
        <button id="tn-fxcopy">Copy POSTFX block</button>
      </div>
      <p class="hint" id="tn-fx-off" style="display:none">Post-processing is not
        active on this device tier. Set <b>POSTFX.enabled = true</b> in
        config.js and reload to force it on.</p>
    </details>

    <details>
      <summary>Performance</summary>
      <dl class="stats">
        <dt>FPS</dt><dd id="tn-fps">–</dd>
        <dt>Frame</dt><dd id="tn-ms">–</dd>
        <dt>Draw calls</dt><dd id="tn-calls">–</dd>
        <dt>Triangles</dt><dd id="tn-tris">–</dd>
        <dt>Programs</dt><dd id="tn-progs">–</dd>
        <dt>Pixel ratio</dt><dd id="tn-dpr">–</dd>
        <dt>Device tier</dt><dd id="tn-tier">–</dd>
        <dt>Auto rescales</dt><dd id="tn-rescales">–</dd>
      </dl>
      <label class="check"><input type="checkbox" id="tn-adaptive" checked>
        Adaptive resolution</label>
      <label><span>Ratio</span><input type="range" id="tn-scale" min="0.4" max="1" step="0.05"><span class="val" id="tn-scale-v"></span></label>
      <span style="font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#8b8f98">Preview tier</span>
      <select id="tn-tiersel" style="margin-top:4px">
        <option value="">— current —</option>
        <option value="low">low (budget phone)</option>
        <option value="mid">mid (good phone)</option>
        <option value="high">high (desktop)</option>
      </select>
      <p class="hint">Preview applies that tier's pixel-ratio cap and post-FX
        budget live. MSAA and the renderer's antialias are fixed at construction,
        so reload to test those.</p>
    </details>

    <details>
      <summary>Mobile tester</summary>
      <select id="tn-device"></select>
      <dl class="stats" style="margin-top:8px">
        <dt>Stage</dt><dd id="tn-vp">–</dd>
        <dt>Aspect</dt><dd id="tn-aspect">–</dd>
        <dt>Tier</dt><dd id="tn-mtier">–</dd>
        <dt>Post FX</dt><dd id="tn-mfx">–</dd>
        <dt>AO</dt><dd id="tn-mao">–</dd>
      </dl>
      <p class="hint"><b>3D framing only.</b> The canvas measures its own
        element, so camera framing and the narrow-viewport correction are
        accurate here. CSS is not: cards and type size off <code>vw</code>/
        <code>vh</code> and media queries, which still see the real window —
        a card may look like it overflows when it is fine on a real phone.
        Use device mode or an actual handset to judge layout.</p>
      <p class="hint">Quality is a separate axis — reload with
        <b>?tier=low</b> / <b>mid</b> / <b>high</b> for that tier's real
        pipeline, including the antialias and AO settings that are fixed when
        the renderer is built.</p>
      <div class="row" style="margin-top:6px">
        <button id="tn-golow">Reload ?tier=low</button>
        <button id="tn-gohigh">Reload ?tier=high</button>
      </div>
    </details>

    <details open>
      <summary>Paste into config.js</summary>
      <pre id="tn-out"></pre>
      <button id="tn-copy">Copy region line</button>
      <pre id="tn-look"></pre>
      <button id="tn-lookcopy">Copy HIGHLIGHT block</button>
      <label class="check" style="margin-top:10px"><input type="checkbox" id="tn-persist">
        Remember my edits across reloads</label>
      <p class="hint" id="tn-persist-note">Off: a reload restores whatever is
        in config.js.</p>
      <button id="tn-clear">Clear saved edits and reload</button>
    </details>
    </div>
  `;
  document.body.appendChild(panel);

  const $ = (id) => panel.querySelector('#' + id);
  const stepSel = $('tn-step');
  const placeMode = $('tn-place');
  const out = $('tn-out');
  const camOut = $('tn-cam');

  steps.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = `${i + 1}. ${s.kicker}`;
    stepSel.appendChild(o);
  });

  const sliders = {
    sx: $('tn-sx'), sy: $('tn-sy'), sz: $('tn-sz'),
    cx: $('tn-cx'), cy: $('tn-cy'), cz: $('tn-cz'),
  };

  function refreshInputs() {
    const r = regions[active];
    sliders.sx.value = r.size[0]; sliders.sy.value = r.size[1]; sliders.sz.value = r.size[2];
    sliders.cx.value = r.center[0]; sliders.cy.value = r.center[1]; sliders.cz.value = r.center[2];
    for (const k of Object.keys(sliders)) $(`tn-${k}-v`).textContent = (+sliders[k].value).toFixed(2);
    const n = (v) => +v.toFixed(2);
    out.textContent =
      `region: { center: [${r.center.map(n).join(', ')}], ` +
      `size: [${r.size.map(n).join(', ')}] },`;
  }

  for (const [key, el] of Object.entries(sliders)) {
    el.addEventListener('input', () => {
      const r = regions[active];
      const target = key[0] === 's' ? r.size : r.center;
      target[{ x: 0, y: 1, z: 2 }[key[1]]] = +el.value;
      refreshInputs();
      syncScene();
    });
  }

  stepSel.addEventListener('change', () => {
    active = +stepSel.value;
    refreshInputs();
    syncScene();
  });

  $('tn-freeze').addEventListener('change', (e) => {
    frozen = e.target.checked;
    control.suspendStepSync = frozen;
    if (frozen) syncScene();
  });

  $('tn-wire').addEventListener('change', (e) => {
    boxHelper.visible = e.target.checked;
    render();
  });

  // Look controls write straight to the live uniforms. Feather is stored on
  // the uniform in world units, so track the normalized fraction here for
  // the config snippet.
  const u = highlighter.uniforms;
  let featherFrac = Number.isFinite(saved?.look?.edgeFeather) ? saved.look.edgeFeather : 0.1;
  u.uFocusFeather.value = scene3d.boundingRadius * featherFrac;
  const lookOut = $('tn-look');

  function refreshLookOut() {
    const n = (v) => +(+v).toFixed(2);
    lookOut.textContent =
      `export const HIGHLIGHT = {\n` +
      `  color: 0x${u.uFocusColor.value.getHexString()},\n` +
      `  opacity: ${n(u.uFocusOpacity.value)},\n` +
      `  tintStrength: ${n(u.uTintStrength.value)},\n` +
      `  emissiveBoost: ${n(u.uEmissiveBoost.value)},\n` +
      `  dimLevel: ${n(u.uDimLevel.value)},\n` +
      `  edgeFeather: ${n(featherFrac)},\n` +
      `};`;
  }

  const look = [
    ['tn-opacity', (v) => { u.uFocusOpacity.value = v / 100; }, () => Math.round(u.uFocusOpacity.value * 100), 0],
    ['tn-feather', (v) => { featherFrac = v; u.uFocusFeather.value = scene3d.boundingRadius * v; }, () => featherFrac, 2],
    ['tn-tint', (v) => { u.uTintStrength.value = v; }, () => u.uTintStrength.value, 2],
    ['tn-glow', (v) => { u.uEmissiveBoost.value = v; }, () => u.uEmissiveBoost.value, 2],
    ['tn-dim', (v) => { u.uDimLevel.value = v; }, () => u.uDimLevel.value, 2],
  ];
  for (const [id, apply, initial, decimals] of look) {
    const el = $(id);
    el.value = initial();
    $(`${id}-v`).textContent = (+el.value).toFixed(decimals);
    el.addEventListener('input', () => {
      apply(+el.value);
      $(`${id}-v`).textContent = (+el.value).toFixed(decimals);
      refreshLookOut();
      render();
    });
  }

  // Color: native picker + hex text field, kept in sync both ways. Wireframe
  // outline follows so it always matches the highlight.
  const colorEl = $('tn-color');
  const hexEl = $('tn-hex');
  function setColor(hex, from) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    u.uFocusColor.value.set(hex);
    boxHelper.material.color.set(hex);
    if (from !== colorEl) colorEl.value = hex;
    if (from !== hexEl) hexEl.value = hex;
    refreshLookOut();
    render();
  }
  colorEl.value = hexEl.value = '#' + u.uFocusColor.value.getHexString();
  colorEl.addEventListener('input', () => setColor(colorEl.value, colorEl));
  hexEl.addEventListener('input', () => {
    const v = hexEl.value.startsWith('#') ? hexEl.value : '#' + hexEl.value;
    setColor(v, hexEl);
  });

  // ---------------------------------------------------------------- minimize
  const minBtn = $('tn-min');
  minBtn.addEventListener('click', () => {
    const min = panel.classList.toggle('is-min');
    minBtn.textContent = min ? '+' : '–';
    minBtn.title = minBtn.ariaLabel = min ? 'Expand panel' : 'Minimize panel';
  });

  // ------------------------------------------------------------------- camera
  $('tn-free').addEventListener('change', (e) => {
    freeLook.setEnabled(e.target.checked);
    updateCamera();
  });
  $('tn-recenter').addEventListener('click', () => freeLook.recenter());

  // Framing: writes straight into the live CAMERA_SETTINGS object, which the
  // rig re-reads every frame — so there is nothing to re-apply.
  const camSetOut = $('tn-camset');
  // Always resolved through the rig, so the panel and the render agree on
  // which profile is active even as the stage is resized underneath it.
  const prof = () => rig.activeFraming();

  function refreshCamSet() {
    const f = CAMERA_SETTINGS.framing;
    const n = (v) => (+v).toFixed(2);
    const line = (k) =>
      `    ${k}: { offset: [${n(f[k].offset[0])}, ${n(f[k].offset[1])}], ` +
      `zoom: ${n(f[k].zoom)} },`;
    camSetOut.textContent =
      `export const CAMERA_SETTINGS = {\n` +
      `  distanceScale: ${n(CAMERA_SETTINGS.distanceScale)},\n` +
      `  framing: {\n` +
      `    compactBelowWidth: ${f.compactBelowWidth},\n` +
      `    compactBelowHeight: ${f.compactBelowHeight},\n` +
      `${line('desktop')}\n${line('mobile')}\n` +
      `  },\n` +
      `};`;
  }

  const framing = [
    ['tn-fox', (v) => { prof().offset[0] = v; }, () => prof().offset[0]],
    ['tn-foy', (v) => { prof().offset[1] = v; }, () => prof().offset[1]],
    ['tn-fzoom', (v) => { prof().zoom = v; }, () => prof().zoom],
    ['tn-dist', (v) => { CAMERA_SETTINGS.distanceScale = v; }, () => CAMERA_SETTINGS.distanceScale],
  ];
  for (const [id, apply, initial] of framing) {
    const el = $(id);
    el.value = initial();
    $(`${id}-v`).textContent = (+el.value).toFixed(2);
    el.addEventListener('input', () => {
      apply(+el.value);
      $(`${id}-v`).textContent = (+el.value).toFixed(2);
      refreshCamSet();
      // Free-look owns the camera outright, so the rig won't re-apply framing
      // until it is switched back off.
      if (!freeLook.enabled) rig.update(1 / 60);
      // Update the warning here rather than leaving it to the timer: under a
      // heavy render load the interval gets starved and can lag by ~a second,
      // which reads as the warning being stuck on after you have fixed it.
      refreshOffscreen();
      render();
    });
  }

  /** Pull the sliders back in line with whichever profile is now active. */
  function refreshFramingInputs() {
    for (const [id, , initial] of framing) {
      $(id).value = initial();
      $(`${id}-v`).textContent = (+$(id).value).toFixed(2);
    }
    const name = rig.framingProfile();
    const w = scene3d.canvas.clientWidth;
    const h = scene3d.canvas.clientHeight;
    $('tn-prof-desktop').classList.toggle('is-active', name === 'desktop');
    $('tn-prof-mobile').classList.toggle('is-active', name === 'mobile');
    $('tn-profile-note').textContent =
      `Editing the ${name} profile — stage is ${w}×${h}.`;
  }

  // The toggle resizes the stage rather than just re-pointing the sliders.
  // Editing the mobile profile at desktop size would show you nothing: the rig
  // renders whichever profile matches the actual canvas. Driving the size keeps
  // one source of truth and guarantees what you edit is what you see.
  $('tn-prof-desktop').addEventListener('click', () => applyDevice(0));
  // Return to the phone you were last working on, not a fixed default, so a
  // Desktop/Mobile round trip does not silently move you to another handset.
  $('tn-prof-mobile').addEventListener('click', () => applyDevice(lastMobilePreset));

  $('tn-framereset').addEventListener('click', () => {
    const p = prof();
    p.offset[0] = 0;
    p.offset[1] = 0;
    p.zoom = 1;
    refreshFramingInputs();
    refreshCamSet();
    if (!freeLook.enabled) rig.update(1 / 60);
    refreshOffscreen();
    render();
  });
  $('tn-camsetcopy').addEventListener('click', () =>
    copy(camSetOut.textContent, $('tn-camsetcopy'), 'Copy CAMERA_SETTINGS'));

  // ------------------------------------------------------------------ post fx
  const fxOut = $('tn-fxout');
  if (postfx && postfx.composer) {
    const v = postfx.values();
    const fx = [
      ['tn-fx-on'],
      ['tn-bloom', (x) => { postfx.bloomIntensity = x; }, v.intensity, 2],
      ['tn-thresh', (x) => { postfx.bloomThreshold = x; }, v.luminanceThreshold, 2],
      ['tn-smooth', (x) => { postfx.bloomSmoothing = x; }, v.luminanceSmoothing, 2],
      ['tn-radius', (x) => { postfx.bloomRadius = x; }, v.radius, 2],
      ['tn-vigo', (x) => { postfx.vignetteOffset = x; }, v.offset, 2],
      ['tn-vigd', (x) => { postfx.vignetteDarkness = x; }, v.darkness, 2],
      ['tn-aoi', (x) => { postfx.aoIntensity = x; }, v.aoIntensity, 2],
      ['tn-aor', (x) => { postfx.aoRadius = x; }, v.aoRadius, 2],
      ['tn-aob', (x) => { postfx.aoBias = x; }, v.aoBias, 3],
    ];
    // AO is decided when the composer is built, so if this tier skipped it the
    // sliders would be writing into nothing — hide them and say why.
    if (!postfx.hasAO) {
      $('tn-ao-body').style.display = 'none';
      $('tn-ao-off').style.display = '';
    }
    for (const [id, apply, initial, decimals] of fx.slice(1)) {
      const el = $(id);
      el.value = initial;
      $(`${id}-v`).textContent = (+el.value).toFixed(decimals);
      el.addEventListener('input', () => {
        apply(+el.value);
        $(`${id}-v`).textContent = (+el.value).toFixed(decimals);
        refreshFxOut();
        render();
      });
    }
    const onEl = $('tn-fx-on');
    onEl.checked = postfx.active;
    onEl.addEventListener('change', () => {
      postfx.setEnabled(onEl.checked);
      render();
    });
    $('tn-fxcopy').addEventListener('click', () =>
      copy(fxOut.textContent, $('tn-fxcopy'), 'Copy POSTFX block'));
  } else {
    $('tn-fx-body').style.display = 'none';
    $('tn-fx-off').style.display = '';
  }

  function refreshFxOut() {
    if (!postfx || !postfx.composer) return;
    const v = postfx.values();
    const n = (x) => +x.toFixed(2);
    // enabled/multisampling are not live-editable (they decide renderer
    // construction), so echo what is actually configured rather than a guess.
    const enabled = typeof POSTFX.enabled === 'string'
      ? `'${POSTFX.enabled}'`
      : String(POSTFX.enabled);
    fxOut.textContent =
      `export const POSTFX = {\n` +
      `  enabled: ${enabled},\n` +
      `  multisampling: ${POSTFX.multisampling},\n` +
      `  bloom: {\n` +
      `    intensity: ${n(v.intensity)},\n` +
      `    luminanceThreshold: ${n(v.luminanceThreshold)},\n` +
      `    luminanceSmoothing: ${n(v.luminanceSmoothing)},\n` +
      `    radius: ${n(v.radius)},\n` +
      `  },\n` +
      `  vignette: { offset: ${n(v.offset)}, darkness: ${n(v.darkness)} },\n` +
      `  ao: {\n` +
      `    enabled: ${typeof POSTFX.ao.enabled === 'string' ? `'${POSTFX.ao.enabled}'` : POSTFX.ao.enabled},\n` +
      `    intensity: ${n(v.aoIntensity)},\n` +
      `    radius: ${n(v.aoRadius)},\n` +
      `    bias: ${+v.aoBias.toFixed(3)},\n` +
      `    resolutionScale: ${POSTFX.ao.resolutionScale},\n` +
      `  },\n` +
      `};`;
  }

  // ---------------------------------------------------------------- keyframes
  // Edits mutate CAMERA_KEYFRAMES in place — the rig re-reads it every frame,
  // so the camera track changes live with no re-wiring.
  const kfSel = $('tn-kf');
  const kfOut = $('tn-kfout');
  const kfWarn = $('tn-kfwarn');
  // Track the selected keyframe by identity, not index: editing `p` re-sorts
  // the array, and an index would silently start pointing at a different one.
  let kfActive = CAMERA_KEYFRAMES[0];

  const kfIndex = () => CAMERA_KEYFRAMES.indexOf(kfActive);
  const warn = (msg) => {
    kfWarn.style.display = msg ? '' : 'none';
    kfWarn.textContent = msg || '';
  };

  function refreshKeyframes() {
    kfSel.innerHTML = '';
    CAMERA_KEYFRAMES.forEach((k, i) => {
      const o = document.createElement('option');
      o.value = String(i);
      o.textContent =
        `${i + 1}. p=${k.p.toFixed(2)}  az=${Math.round(k.azimuth)}  ` +
        `pol=${Math.round(k.polar)}  z=${k.zoom.toFixed(2)}`;
      kfSel.appendChild(o);
    });
    if (kfIndex() < 0) kfActive = CAMERA_KEYFRAMES[0];
    kfSel.value = String(kfIndex());

    const pEl = $('tn-kfp');
    pEl.value = kfActive.p;
    $('tn-kfp-v').textContent = kfActive.p.toFixed(2);

    kfOut.textContent =
      'export const CAMERA_KEYFRAMES = [\n' +
      CAMERA_KEYFRAMES.map((k) =>
        `  { p: ${k.p.toFixed(2)}, azimuth: ${Math.round(k.azimuth)}, ` +
        `polar: ${Math.round(k.polar)}, zoom: ${k.zoom.toFixed(2)} },`).join('\n') +
      '\n];';
  }

  // sample() walks the track assuming ascending p, and divides by the gap
  // between neighbours — duplicates would produce a divide-by-zero and NaN
  // camera angles, so keep it sorted and spaced.
  const kfSort = () => CAMERA_KEYFRAMES.sort((a, b) => a.p - b.p);
  const kfTooClose = (p, ignore) =>
    CAMERA_KEYFRAMES.some((k) => k !== ignore && Math.abs(k.p - p) < 0.005);

  kfSel.addEventListener('change', () => {
    kfActive = CAMERA_KEYFRAMES[+kfSel.value];
    refreshKeyframes();
    warn('');
  });

  $('tn-kfp').addEventListener('input', (e) => {
    const p = +e.target.value;
    if (kfTooClose(p, kfActive)) {
      warn('Another keyframe already sits at that p — they must stay distinct.');
      return;
    }
    warn('');
    kfActive.p = p;
    kfSort();
    refreshKeyframes();
    if (!freeLook.enabled) rig.update(1 / 60);
    render();
  });

  $('tn-kfjump').addEventListener('click', () => {
    // Scroll the page to the beat rather than teleporting the rig, so cards
    // and highlights land in the same state a reader would see.
    // Measured from the module root's live position, so this works wherever
    // the module is mounted.
    const sec = dbg.root;
    const top = sec.getBoundingClientRect().top + window.scrollY;
    const scrollable = sec.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + scrollable * kfActive.p, behavior: 'smooth' });
  });

  $('tn-kfset').addEventListener('click', () => {
    // Unwrap against this keyframe's own azimuth so it stays on the same turn
    // of the track instead of jumping a revolution.
    const s = freeLook.enabled
      ? freeLook.toKeyframe(kfActive.azimuth)
      : rig.sample(rig.progress);
    kfActive.azimuth = s.azimuth;
    kfActive.polar = s.polar;
    kfActive.zoom = s.zoom;
    refreshKeyframes();
    warn(freeLook.enabled ? '' : 'Free look is off, so this just re-read the existing track.');
    render();
  });

  $('tn-kfadd').addEventListener('click', () => {
    const p = +rig.progress.toFixed(2);
    if (kfTooClose(p, null)) {
      warn(`A keyframe already sits at p=${p.toFixed(2)}. Scroll elsewhere first.`);
      return;
    }
    const s = freeLook.enabled ? freeLook.toKeyframe(rig.sample(p).azimuth) : rig.sample(p);
    kfActive = { p, azimuth: s.azimuth, polar: s.polar, zoom: s.zoom };
    CAMERA_KEYFRAMES.push(kfActive);
    kfSort();
    refreshKeyframes();
    warn('');
  });

  $('tn-kfdel').addEventListener('click', () => {
    if (CAMERA_KEYFRAMES.length <= 2) {
      warn('The track needs at least two keyframes to interpolate between.');
      return;
    }
    const i = kfIndex();
    CAMERA_KEYFRAMES.splice(i, 1);
    kfActive = CAMERA_KEYFRAMES[Math.min(i, CAMERA_KEYFRAMES.length - 1)];
    refreshKeyframes();
    warn('');
    if (!freeLook.enabled) rig.update(1 / 60);
    render();
  });

  $('tn-kfcopy').addEventListener('click', () =>
    copy(kfOut.textContent, $('tn-kfcopy'), 'Copy CAMERA_KEYFRAMES'));

  // ------------------------------------------------------------ mobile tester
  const DEVICES = [
    { label: '— full window —', w: 0, h: 0 },
    { label: 'iPhone SE — 375×667', w: 375, h: 667 },
    { label: 'iPhone 15 — 393×852', w: 393, h: 852 },
    { label: 'Pixel 8 — 412×915', w: 412, h: 915 },
    { label: 'iPad mini — 744×1133', w: 744, h: 1133 },
  ];
  // What the Mobile button jumps to, remembered across trips to Desktop.
  let lastMobilePreset = 2;
  const deviceSel = $('tn-device');
  DEVICES.forEach((d, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = d.label;
    deviceSel.appendChild(o);
  });

  const stage = dbg.stage;

  /**
   * Single path for changing the previewed stage size, shared by the
   * Desktop/Mobile toggle and this dropdown, so the two can never disagree
   * about what is on screen.
   */
  function applyDevice(index) {
    deviceSel.value = String(index);
    deviceSel.dispatchEvent(new Event('change'));
  }

  deviceSel.addEventListener('change', () => {
    const idx = +deviceSel.value;
    const d = DEVICES[idx];
    // Remember any preset that actually lands on the mobile profile, so the
    // toggle brings you back to this handset rather than the default one.
    if (d.w && ((d.w < CAMERA_SETTINGS.framing.compactBelowWidth) ||
                (d.h < CAMERA_SETTINGS.framing.compactBelowHeight))) {
      lastMobilePreset = idx;
    }
    if (!d.w) {
      stage.style.width = stage.style.height = stage.style.margin = '';
      stage.style.outline = '';
    } else {
      stage.style.width = `${d.w}px`;
      stage.style.height = `${d.h}px`;
      stage.style.margin = '0 auto';
      stage.style.outline = '1px solid #2fbf71';
    }
    // The canvas is sized by CSS, so the renderer only learns about this when
    // told; the sticky trigger's cached start/end need recomputing too.
    scene3d.resize();
    if (dbg.ScrollTrigger) dbg.ScrollTrigger.refresh();
    refreshDevice();
    // Resizing the stage can flip which framing profile is active, so the
    // sliders have to re-bind to the profile now in effect.
    refreshFramingInputs();
    if (!freeLook.enabled) rig.update(1 / 60);
    refreshOffscreen();
    render();
  });

  /**
   * Warn when the authored framing has pushed the model past the screen edge.
   *
   * Deliberately measures the CURRENT frame with the live camera rather than
   * sweeping every beat — sweeping would mean driving the rig to other
   * progress values, which would visibly jump the view the author is editing.
   * Uses the bounding box, which is conservative, so it stays quiet at the
   * shipped defaults (worst case 0.84 of the way to the edge).
   */
  const _corner = new THREE.Vector3();
  function refreshOffscreen() {
    const bb = scene3d.bounds;
    const cam = scene3d.camera;
    cam.updateMatrixWorld();
    let worst = 0;
    for (const x of [bb.min.x, bb.max.x])
      for (const y of [bb.min.y, bb.max.y])
        for (const z of [bb.min.z, bb.max.z]) {
          _corner.set(x, y, z).project(cam);
          worst = Math.max(worst, Math.abs(_corner.x), Math.abs(_corner.y));
        }
    const el = $('tn-offscreen');
    if (worst > 1.001) {
      el.style.display = '';
      el.textContent =
        `⚠ ${Math.round(((worst - 1) / worst) * 100)}% of the model is off ` +
        `screen at this angle. Pull Zoom up or ease the offset back.`;
    } else {
      el.style.display = 'none';
    }
  }

  function refreshDevice() {
    const w = scene3d.canvas.clientWidth;
    const h = scene3d.canvas.clientHeight;
    $('tn-vp').textContent = `${w}×${h}`;
    $('tn-aspect').textContent = h ? (w / h).toFixed(2) : '–';
    $('tn-mtier').textContent = scene3d.tier;
    $('tn-mfx').textContent = postfx && postfx.active ? 'on' : 'off';
    $('tn-mao').textContent = postfx && postfx.hasAO ? 'on' : 'off';
  }

  const reloadWithTier = (tier) => {
    const u = new URL(location.href);
    u.searchParams.set('tune', '');
    u.searchParams.set('tier', tier);
    location.href = u.toString();
  };
  $('tn-golow').addEventListener('click', () => reloadWithTier('low'));
  $('tn-gohigh').addEventListener('click', () => reloadWithTier('high'));

  // -------------------------------------------------------------- performance
  const scaleEl = $('tn-scale');
  scaleEl.value = scene3d.pixelRatioScale;
  $('tn-scale-v').textContent = (+scaleEl.value).toFixed(2);
  scaleEl.addEventListener('input', () => {
    // Manual override switches the closed loop off; the checkbox turns it back on.
    quality.setScale(+scaleEl.value);
    $('tn-adaptive').checked = false;
    $('tn-scale-v').textContent = (+scaleEl.value).toFixed(2);
    render();
  });
  $('tn-adaptive').addEventListener('change', (e) => {
    if (e.target.checked) quality.resume();
    else quality.enabled = false;
  });
  $('tn-tiersel').addEventListener('change', (e) => {
    const tier = e.target.value;
    if (!tier) {
      scene3d.applyPixelRatio(scene3d.tier, 1);
    } else {
      scene3d.applyPixelRatio(tier, 1);
      if (postfx && postfx.composer) {
        postfx.setEnabled(TIER_PROFILE[tier].postfx);
        $('tn-fx-on').checked = postfx.active;
      }
    }
    render();
  });

  function refreshStats() {
    const info = scene3d.renderer.info;
    const fps = quality.fps;
    const fpsEl = $('tn-fps');
    fpsEl.textContent = fps ? fps.toFixed(0) : '–';
    fpsEl.className = fps >= 50 ? 'good' : fps && fps < 30 ? 'bad' : '';
    $('tn-ms').textContent = quality.frameMs ? quality.frameMs.toFixed(1) + ' ms' : '–';
    $('tn-calls').textContent = info.render.calls;
    $('tn-tris').textContent = info.render.triangles.toLocaleString();
    $('tn-progs').textContent = info.programs ? info.programs.length : '–';
    $('tn-dpr').textContent = scene3d.renderer.getPixelRatio().toFixed(2);
    $('tn-tier').textContent = scene3d.tier;
    $('tn-rescales').textContent = quality.changes;
    // Mirror closed-loop changes back into the slider.
    if (quality.enabled) {
      scaleEl.value = scene3d.pixelRatioScale;
      $('tn-scale-v').textContent = scene3d.pixelRatioScale.toFixed(2);
    }
  }

  // ------------------------------------------------------------------- copies
  $('tn-copy').addEventListener('click', () => copy(out.textContent, $('tn-copy'), 'Copy region line'));
  $('tn-lookcopy').addEventListener('click', () => copy(lookOut.textContent, $('tn-lookcopy'), 'Copy HIGHLIGHT block'));
  $('tn-camcopy').addEventListener('click', () => copy(camOut.textContent, $('tn-camcopy'), 'Copy keyframe'));

  function copy(text, btn, label) {
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied ✓';
      btn.classList.add('ok');
      setTimeout(() => { btn.textContent = label; btn.classList.remove('ok'); }, 1200);
    });
  }

  /**
   * Live camera readout. Under free-look the numbers are inverted back out of
   * the actual camera position (see FreeLook.toKeyframe); otherwise they come
   * straight off the rig's keyframe track.
   */
  function updateCamera() {
    const s = freeLook.enabled
      ? freeLook.toKeyframe(rig.sample(rig.progress).azimuth)
      : rig.sample(rig.progress);
    camOut.textContent =
      `{ p: ${rig.progress.toFixed(2)}, azimuth: ${Math.round(s.azimuth)}, ` +
      `polar: ${Math.round(s.polar)}, zoom: ${s.zoom.toFixed(2)} },`;

    // A drifted orbit target makes the captured keyframe unreproducible: the
    // rig always looks at the origin.
    const driftEl = $('tn-drift');
    const drift = freeLook.enabled ? freeLook.targetDrift() : 0;
    if (drift > 0.02) {
      driftEl.style.display = '';
      driftEl.textContent =
        `⚠ Orbit target is ${(drift * 100).toFixed(0)}% of the model radius off ` +
        `center — the rig always looks at the origin, so this angle won't ` +
        `reproduce. Recenter before copying.`;
    } else {
      driftEl.style.display = 'none';
    }
  }
  // The window itself can be resized without touching the tuner, which can
  // flip the active profile — so re-bind on a timer rather than only on the
  // device-preset change.
  let lastProfile = rig.framingProfile();
  const refreshTimer = setInterval(() => {
    updateCamera();
    refreshStats();
    refreshOffscreen();
    const now = rig.framingProfile();
    if (now !== lastProfile) {
      lastProfile = now;
      refreshFramingInputs();
      refreshDevice();
    }
  }, 120);

  // The main loop only renders while the section is on screen; nudge a frame
  // after edits made while it is parked.
  function render() {
    scene3d.render(1 / 60);
  }

  // --------------------------------------------------- persistence controls
  const persistEl = $('tn-persist');
  const persistNote = $('tn-persist-note');
  function refreshPersistNote() {
    persistNote.textContent = persistOn
      ? 'Saved in this browser only. config.js is never written — still copy the blocks above to make anything permanent.'
      : 'Off: a reload restores whatever is in config.js.';
  }
  persistEl.checked = persistOn;
  refreshPersistNote();
  persistEl.addEventListener('change', () => {
    persistOn = persistEl.checked;
    localStorage.setItem(OFF_KEY, persistOn ? '0' : '1');
    if (persistOn) saveState();
    else localStorage.removeItem(STORE_KEY);
    refreshPersistNote();
  });
  $('tn-clear').addEventListener('click', () => {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(OFF_KEY);
    location.reload();
  });

  // One set of listeners covers every control in the panel, so new controls
  // are persisted automatically instead of needing their own save call.
  panel.addEventListener('input', scheduleSave);
  panel.addEventListener('change', scheduleSave);
  panel.addEventListener('click', scheduleSave);

  refreshInputs();
  refreshLookOut();
  refreshFxOut();
  refreshFramingInputs();
  refreshCamSet();
  refreshKeyframes();
  refreshDevice();
  refreshOffscreen();
  updateCamera();
  refreshStats();
  syncScene();

  console.log('[tuner] active — click the model to place the highlight, or ' +
    'enable Free look to author camera keyframes.');

  return function disposeTuner() {
    clearInterval(refreshTimer);
    clearTimeout(saveTimer);
    scene3d.canvas.removeEventListener('pointerdown', onPointerDown);
    panel.remove();
    // Hand the camera and the highlight back to the scroll rig.
    freeLook.setEnabled(false);
    freeLook.dispose();
    delete dbg.freeLook;
    control.onFrame = null;
    control.suspendStepSync = false;
    highlighter.activeStepId = undefined; // re-apply the current beat's region
    scene3d.scene.remove(boxHelper);
    boxHelper.geometry.dispose();
    boxHelper.material.dispose();
    // Undo any Mobile tester preview size.
    stage.style.width = stage.style.height = stage.style.margin = '';
    stage.style.outline = '';
    scene3d.resize();
  };
}
