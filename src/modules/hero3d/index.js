import { Scene3D } from './scene.js';
import { initScrolly } from './scrolly.js';
import { resolveConfig } from './config.js';
import './hero3d.css';

export { HERO3D_CONFIG, resolveConfig } from './config.js';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const wantsTunerFromUrl = () =>
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('tune');

/**
 * Mount the scroll-driven 3D hero into `container`.
 *
 * The module builds everything it needs inside the container: the sticky
 * stage (canvas, loader, story cards) and the empty placeholder sections
 * whose heights drive the scroll. Nothing about its position on the page is
 * assumed; every trigger and observer references its own root element.
 *
 * @param {HTMLElement} container  any element in normal document flow. It
 *   must not clip (overflow: hidden/auto/scroll) or position: sticky breaks.
 * @param {object} [options]
 * @param {object} [options.config]     per-mount overrides of config.js blocks,
 *   e.g. { CAMERA_SETTINGS: { distanceScale: 0.9 } }. Objects merge; arrays replace.
 * @param {string} [options.modelUrl]   GLB URL (defaults to config MODEL_URL).
 * @param {string} [options.modelData]  base64 GLB to parse from memory instead.
 * @param {Element|Window} [options.scroller]  custom scroll container for
 *   ScrollTrigger. Leave unset for normal page scrolling.
 * @param {'auto'|boolean} [options.tuner='auto']  true opens the tuner,
 *   'auto' opens it when the URL has ?tune, false disables it completely
 *   (including the hotkey).
 * @param {boolean} [options.tunerHotkey=true]  Alt+Shift+T toggles the tuner
 *   (ignored when tuner is false).
 * @param {string} [options.tunerStorageKey]  localStorage key for the tuner's
 *   "Remember my edits"; set one per mount if several are on one page.
 * @param {(handle: object) => void} [options.onReady]
 * @param {(error: Error) => void} [options.onError]
 * @returns {{ root: HTMLElement, ready: Promise<object>, handle: object|null,
 *   showTuner(): Promise<void>, hideTuner(): void, toggleTuner(): Promise<void>,
 *   destroy(): void }}
 */
export function mountHero3D(container, options = {}) {
  if (!container) throw new Error('mountHero3D: a container element is required');
  const {
    config,
    modelUrl,
    modelData,
    scroller,
    tuner = 'auto',
    tunerHotkey = true,
    tunerStorageKey,
    onReady,
    onError,
  } = options;
  const cfg = resolveConfig(config);

  // ------------------------------------------------------------------ DOM
  const root = document.createElement('section');
  root.className = 'h3d';
  root.setAttribute('aria-label', 'Interactive 3D model');

  const pin = document.createElement('div');
  pin.className = 'h3d__pin';
  const stage = document.createElement('div');
  stage.className = 'h3d__stage';
  stage.innerHTML = `
    <canvas class="h3d__canvas"></canvas>
    <div class="h3d__loading">
      <p class="h3d__loading-label">Loading 3D model <span class="h3d__loading-pct">0%</span></p>
    </div>
    <div class="h3d__cards"></div>
  `;
  pin.appendChild(stage);
  root.appendChild(pin);

  // Empty, labelled placeholder sections. Their heights are the scroll
  // distance the camera track is spread over.
  cfg.SCROLL.sections.forEach((section, i) => {
    root.appendChild(document.createComment(` ${section.label} `));
    const el = document.createElement('div');
    el.className = 'h3d__section';
    el.dataset.h3dSection = String(i + 1);
    el.dataset.label = section.label;
    el.setAttribute('aria-hidden', 'true');
    el.style.height = section.fallback || section.height;
    el.style.height = section.height; // ignored where unsupported, keeping the fallback
    root.appendChild(el);
  });

  container.appendChild(root);

  const canvas = stage.querySelector('.h3d__canvas');
  const loadingEl = stage.querySelector('.h3d__loading');
  const loadingPct = stage.querySelector('.h3d__loading-pct');
  const cardsLayer = stage.querySelector('.h3d__cards');

  // ---------------------------------------------------------------- boot
  let destroyed = false;
  let scrolly = null;
  let disposeTuner = null;
  let tunerLoading = null;

  // No WebGL (blocked by policy, very old device, lost GPU): collapse to a
  // short static panel instead of leaving four empty viewports to scroll.
  let scene3d = null;
  try {
    if (webglAvailable()) scene3d = new Scene3D(canvas, cfg, { modelUrl, modelData });
  } catch (err) {
    console.warn('[hero3d] WebGL unavailable:', err);
  }
  if (!scene3d) {
    root.classList.add('h3d--static');
    loadingEl.querySelector('.h3d__loading-label').textContent =
      'The 3D model needs WebGL, which is not available in this browser.';
    const error = new Error('WebGL unavailable');
    onError?.(error);
    const ready = Promise.reject(error);
    ready.catch(() => {});
    return {
      root,
      ready,
      handle: null,
      showTuner: () => Promise.resolve(),
      hideTuner() {},
      toggleTuner: () => Promise.resolve(),
      destroy() {
        root.remove();
      },
    };
  }

  const ready = scene3d
    .load((ratio) => {
      loadingPct.textContent = `${Math.round(ratio * 100)}%`;
    })
    .then(() => {
      if (destroyed) throw new Error('destroyed');
      loadingEl.classList.add('is-done');
      scrolly = initScrolly(scene3d, { root, stage, cardsLayer, scroller });
      if (tuner === true || (tuner === 'auto' && wantsTunerFromUrl())) showTuner();
      onReady?.(scrolly.handle);
      return scrolly.handle;
    });

  ready.catch((err) => {
    if (destroyed) return; // unmounted mid-load: not an error
    console.error('Failed to load model:', err);
    loadingEl.querySelector('.h3d__loading-label').textContent =
      'The 3D model could not be loaded.';
    onError?.(err);
  });

  // ---------------------------------------------------------------- tuner
  // Dev-only, loaded on demand so it never reaches the production bundle's
  // main chunk (tuner.js and camera-controls are their own chunk).
  function showTuner() {
    if (tuner === false || destroyed) return Promise.resolve();
    if (disposeTuner) return Promise.resolve();
    if (!tunerLoading) {
      tunerLoading = ready
        .then((handle) => import('./tuner.js').then((m) => ({ m, handle })))
        .then(({ m, handle }) => {
          if (destroyed) return;
          disposeTuner = m.initTuner(handle, { storageKey: tunerStorageKey });
        })
        .catch(() => {})
        .finally(() => { tunerLoading = null; });
    }
    return tunerLoading;
  }

  function hideTuner() {
    if (disposeTuner) disposeTuner();
    disposeTuner = null;
  }

  function toggleTuner() {
    if (disposeTuner) {
      hideTuner();
      return Promise.resolve();
    }
    return showTuner();
  }

  const onKeyDown = (e) => {
    if (!(e.altKey && e.shiftKey && e.code === 'KeyT')) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    toggleTuner();
  };
  if (tuner !== false && tunerHotkey) window.addEventListener('keydown', onKeyDown);

  // -------------------------------------------------------------- destroy
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    window.removeEventListener('keydown', onKeyDown);
    hideTuner();
    if (scrolly) scrolly.destroy();
    scrolly = null;
    scene3d.dispose();
    root.remove();
  }

  return {
    root,
    ready,
    get handle() {
      return scrolly ? scrolly.handle : null;
    },
    showTuner,
    hideTuner,
    toggleTuner,
    destroy,
  };
}
