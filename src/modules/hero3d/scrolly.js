import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CameraRig } from './cameraRig.js';
import { Highlighter } from './highlights.js';
import { PostFX } from './postfx.js';
import { AdaptiveQuality } from './quality.js';

gsap.registerPlugin(ScrollTrigger);

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Wires scroll to the 3D experience:
 *   - the module root provides the scrub distance (its placeholder sections,
 *     one viewport per beat — see SCROLL in config.js)
 *   - the stage inside it is position:sticky, so the model holds the viewport
 *   - one ScrollTrigger maps root progress 0..1 onto the camera rig
 *   - a pre-roll trigger scales the stage in as it takes over (the NYT
 *     "image becomes the page" moment) and back out on release
 *   - story cards + highlights are driven from the DAMPED progress so
 *     they stay in lockstep with what the camera is actually showing
 *
 * Every trigger and observer references `root` (the module's own element), so
 * nothing depends on where the module sits on the page.
 *
 * Returns { handle, destroy }. `handle` is the debug/tuning surface the
 * repo exposed as window.__scrolly; here it is per-instance.
 */
export function initScrolly(scene3d, { root, stage, cardsLayer, scroller }) {
  const { STEPS, MOTION, QUALITY, CAMERA_SETTINGS, SCROLL } = scene3d.cfg;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Build the story cards from config so copy lives in config.js. A beat
  // with no copy gets no card; its highlight and timing are unchanged.
  const cardEls = new Map();
  for (const step of STEPS) {
    if (!step.kicker && !step.title && !step.body) continue;
    const el = document.createElement('article');
    el.className = 'h3d-card';
    el.innerHTML = `
      <p class="h3d-card__kicker">${escapeHtml(step.kicker || '')}</p>
      <h3 class="h3d-card__title">${escapeHtml(step.title || '')}</h3>
      <p class="h3d-card__body">${escapeHtml(step.body || '')}</p>
    `;
    gsap.set(el, { autoAlpha: 0, y: 48 });
    cardsLayer.appendChild(el);
    cardEls.set(step.id, el);
  }

  const rig = new CameraRig(scene3d);
  const highlighter = new Highlighter(scene3d);

  // Post-processing is built after the materials exist, so the composer's
  // first compile sees the highlight-patched shaders.
  const postfx = new PostFX(scene3d, scene3d.tier);
  scene3d.attachPostFX(postfx);
  const quality = new AdaptiveQuality(scene3d, scene3d.tier);

  // Everything GSAP creates in here is reverted by ctx.revert() on destroy.
  const ctx = gsap.context(() => {
    // Main scrub: root progress -> camera target progress.
    ScrollTrigger.create({
      trigger: root,
      scroller,
      start: SCROLL.main.start,
      end: SCROLL.main.end,
      scrub: SCROLL.main.scrub,
      onUpdate: (self) => rig.setTargetProgress(self.progress),
    });

    // Takeover pre-roll: the stage grows from an inset figure to full-bleed
    // as it scrolls into place, and releases the same way on the way out.
    // Skipped for reduced motion — the stage just sits at its final state.
    if (!reducedMotion) {
      gsap.fromTo(stage, SCROLL.takeover.from, {
        ...SCROLL.takeover.to,
        scrollTrigger: {
          trigger: root,
          scroller,
          start: SCROLL.takeover.start,
          end: SCROLL.takeover.end,
          scrub: SCROLL.takeover.scrub,
        },
      });
    }
  }, root);

  // ScrollTrigger caches start/end in pixels. Content above the module that
  // changes height after load (web fonts, images, text reveals) would shift
  // the real start without a window resize, so re-measure when the document's
  // size changes. This only reads the document; it assumes nothing about it.
  let refreshTimer = 0;
  const scheduleRefresh = () => {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 150);
  };
  const layoutObserver = new ResizeObserver(scheduleRefresh);
  layoutObserver.observe(document.documentElement);
  if (document.fonts?.ready) document.fonts.ready.then(scheduleRefresh);

  // Only render while the module is anywhere near the viewport.
  let visible = false;
  const visibilityObserver = new IntersectionObserver(
    (entries) => { visible = entries[0].isIntersecting; },
    { rootMargin: SCROLL.renderRootMargin }
  );
  visibilityObserver.observe(root);

  // ...and not at all while the tab is backgrounded. The observer above only
  // knows about scroll position; a backgrounded tab still fires rAF on some
  // platforms, which is pure battery drain on a phone.
  let hidden = false;
  const onVisibilityChange = () => {
    hidden = document.hidden;
    last = performance.now(); // don't bill the away-time to the next frame
  };
  if (QUALITY.pauseWhenHidden) {
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  // Story-beat sequencing runs off the *damped* progress, so cards and
  // highlights land exactly when the camera arrives, not when the wheel does.
  // `suspend` lets the tuner (tuner.js) take over region control.
  let activeCardId = null;
  // suspendStepSync: tuner owns the highlight region.
  // suspendCamera:   tuner's free-look owns camera.position.
  // onFrame:         per-frame hook for tuner-side controls that need dt.
  const control = { suspendStepSync: false, suspendCamera: false, onFrame: null };
  function syncStep(progress) {
    if (control.suspendStepSync) return;
    const step = STEPS.find((s) => progress >= s.start && progress < s.end) || null;
    highlighter.setStep(step);

    const id = step ? step.id : null;
    if (id === activeCardId) return;
    // Reduced motion: cross-fade in place instead of sliding.
    const outgoing = activeCardId && cardEls.get(activeCardId);
    if (outgoing) {
      gsap.to(outgoing, {
        autoAlpha: 0,
        y: reducedMotion ? 0 : -36,
        duration: reducedMotion ? 0.15 : MOTION.cardOut,
        ease: 'power2.in',
        overwrite: 'auto',
      });
    }
    const incoming = id && cardEls.get(id);
    if (incoming) {
      gsap.fromTo(
        incoming,
        { autoAlpha: 0, y: reducedMotion ? 0 : 48 },
        {
          autoAlpha: 1,
          y: 0,
          duration: reducedMotion ? 0.2 : MOTION.cardIn,
          ease: 'power3.out',
          delay: reducedMotion ? 0 : 0.12,
          overwrite: 'auto',
        }
      );
    }
    activeCardId = id;
  }

  // Render loop.
  let last = performance.now();
  let frame = 0;
  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (visible && !hidden) {
      // Free-look (tuner) takes the camera over; otherwise the scroll rig has it.
      if (!control.suspendCamera) rig.update(dt);
      if (control.onFrame) control.onFrame(dt);
      syncStep(rig.progress);
      quality.update(dt);
      scene3d.render(dt);
    }
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);

  // Prime the very first frame so the stage isn't blank pre-scroll.
  rig.update(1 / 60);
  scene3d.render(1 / 60);

  // Debug/tuning handle (what the repo exposed as window.__scrolly). Used by
  // tuner.js; reach it from outside via the instance returned by mountHero3D.
  const handle = {
    rig, highlighter, scene3d, gsap, steps: STEPS, control, postfx, quality,
    // The tuner's device preview resizes the sticky stage, which invalidates
    // every trigger's cached start/end — it needs this to recompute them.
    ScrollTrigger,
    // Live config, so tuning scripts can sweep framing settings without a
    // rebuild. The rig re-reads it every frame.
    CAMERA_SETTINGS,
    root,
    stage,
  };

  function destroy() {
    cancelAnimationFrame(frame);
    clearTimeout(refreshTimer);
    layoutObserver.disconnect();
    visibilityObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    // Kills both ScrollTriggers and the takeover tween, restoring the stage's
    // inline styles.
    ctx.revert();
    gsap.killTweensOf([...cardEls.values()]);
    highlighter.dispose();
    cardsLayer.replaceChildren();
  }

  return { handle, destroy };
}
