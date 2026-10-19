import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Spatial green-glow highlighter.
 *
 * Instead of relying on named meshes (AI-generated / photogrammetry GLBs are
 * often a single fused mesh), this injects a small chunk into every standard
 * material via onBeforeCompile:
 *
 *   - a soft-edged box region (world-space center + half-size) receives a
 *     green tint and emissive boost -> the "fade on green"
 *   - everything OUTSIDE the region is dimmed toward HIGHLIGHT.dimLevel
 *     -> the rest of the model recedes while a part is being discussed
 *
 * Both effects hang off two scalar uniforms (uFocusStrength, uDimStrength)
 * that GSAP tweens on step changes, so fades are perfectly smooth and cost
 * nothing extra per-frame. Works on any GLB with zero config beyond the
 * normalized region coordinates in config.js.
 */
export class Highlighter {
  constructor(scene3d) {
    this.scene3d = scene3d;
    this.cfg = scene3d.cfg;
    const { HIGHLIGHT } = this.cfg;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.uniforms = {
      uFocusCenter: { value: new THREE.Vector3() },
      uFocusHalfSize: { value: new THREE.Vector3(1, 1, 1) },
      uFocusFeather: { value: 0.15 },
      uFocusStrength: { value: 0 },
      uDimStrength: { value: 0 },
      uFocusColor: { value: new THREE.Color(HIGHLIGHT.color) },
      uFocusOpacity: { value: HIGHLIGHT.opacity },
      uDimLevel: { value: HIGHLIGHT.dimLevel },
      uTintStrength: { value: HIGHLIGHT.tintStrength },
      uEmissiveBoost: { value: HIGHLIGHT.emissiveBoost },
    };

    for (const mesh of scene3d.meshes) this.patchMaterial(mesh.material);

    this.activeStepId = null;
    this.fadeTl = null;
  }

  patchMaterial(material) {
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);

      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vFocusWorldPos;'
        )
        .replace(
          '#include <project_vertex>',
          '#include <project_vertex>\nvFocusWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vFocusWorldPos;
          uniform vec3 uFocusCenter;
          uniform vec3 uFocusHalfSize;
          uniform float uFocusFeather;
          uniform float uFocusStrength;
          uniform float uDimStrength;
          uniform vec3 uFocusColor;
          uniform float uFocusOpacity;
          uniform float uDimLevel;
          uniform float uTintStrength;
          uniform float uEmissiveBoost;`
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          {
            // Signed distance to a box region: 0 inside, growing outside.
            vec3 d = abs(vFocusWorldPos - uFocusCenter) - uFocusHalfSize;
            float boxDist = length(max(d, vec3(0.0))) + min(max(d.x, max(d.y, d.z)), 0.0);
            // 1 inside the rectangle, feathering to 0 over uFocusFeather
            float focusMask = 1.0 - smoothstep(0.0, uFocusFeather, boxDist);
            // uFocusOpacity: user-set fill amount (1 = solid, 0 = invisible);
            // uFocusStrength is the scroll-driven fade on top of it.
            float f = focusMask * uFocusStrength * uFocusOpacity;
            // dim everything outside the region while a step is active
            float dimMask = 1.0 - focusMask;
            diffuseColor.rgb *= mix(1.0, uDimLevel, dimMask * uDimStrength);
            // saturated green: tint the surface multiplicatively (keeps the
            // sculpted shading), then add a small glow for luminosity
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uFocusColor * 1.6, f * uTintStrength);
            totalEmissiveRadiance += uFocusColor * (f * uEmissiveBoost);
          }`
        );
    };
    // Force distinct programs per patched material.
    material.customProgramCacheKey = () => 'spatial-highlight';
    material.needsUpdate = true;
  }

  /**
   * Point the (invisible) highlight box at a region, expressed in normalized
   * bounding-box space — see config.js. Shared by the scroll sequencing
   * below and by the live tuner (src/tuner.js).
   */
  applyRegion(region) {
    const u = this.uniforms;
    u.uFocusCenter.value.copy(this.scene3d.normalizedToWorld(region.center));
    const box = this.scene3d.bounds.getSize(new THREE.Vector3());
    u.uFocusHalfSize.value.set(
      (box.x * region.size[0]) / 2,
      (box.y * region.size[1]) / 2,
      (box.z * region.size[2]) / 2
    );
    u.uFocusFeather.value = this.scene3d.boundingRadius * this.cfg.HIGHLIGHT.edgeFeather;
  }

  /**
   * Fade toward a step's region (or fade everything out when step is null).
   * Sequencing matches the brief: dim the current green out, move the focus,
   * fade the next green in.
   */
  setStep(step) {
    const id = step ? step.id : null;
    if (id === this.activeStepId) return;
    this.activeStepId = id;

    if (this.fadeTl) this.fadeTl.kill();
    const { MOTION } = this.cfg;
    const u = this.uniforms;
    const tl = gsap.timeline();
    this.fadeTl = tl;

    // 1) fade the current green off (near-instant under reduced motion)
    tl.to([u.uFocusStrength, u.uDimStrength], {
      value: 0,
      duration: this.reducedMotion ? 0.1 : MOTION.highlightFadeOut,
      ease: 'power2.out',
    });

    if (step) {
      // 2) jump the (invisible) region to the new part of the model
      tl.call(() => this.applyRegion(step.region));
      // 3) fade the green on
      tl.to([u.uFocusStrength, u.uDimStrength], {
        value: 1,
        duration: this.reducedMotion ? 0.15 : MOTION.highlightFadeIn,
        ease: 'power2.inOut',
      });
    }
  }

  dispose() {
    if (this.fadeTl) this.fadeTl.kill();
    this.fadeTl = null;
  }
}
