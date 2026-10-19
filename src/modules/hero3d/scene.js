import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import {
  detectDeviceTier, resolvePixelRatio, TIER_PROFILE, postFXWanted,
} from './quality.js';

/**
 * Re-attaches textures that GLTFLoader failed to load under a strict
 * Content-Security-Policy. The loader turns a GLB's packed images into
 * blob: URLs and fetch()es them; CSPs without blob: in connect-src refuse
 * that, and the loader tolerantly resolves with null maps. Here we read the
 * same image bytes straight out of the GLB container and decode them with
 * createImageBitmap(Blob) — pure in-memory decoding no CSP can block.
 */
async function restoreBlockedTextures(gltf, arrayBuffer) {
  if (typeof createImageBitmap === 'undefined') return;

  // GLB container: 12-byte header, then [len][type][data] chunks.
  // Chunk 0 is JSON; chunk 1 is the binary payload the bufferViews index.
  const view = new DataView(arrayBuffer);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(
    new TextDecoder().decode(new Uint8Array(arrayBuffer, 20, jsonLength))
  );
  if (!json.images?.length || !json.materials?.length) return;
  const binStart = 20 + jsonLength + 8;

  const bitmaps = await Promise.all(
    json.images.map((img) => {
      const bv = json.bufferViews[img.bufferView];
      const blob = new Blob(
        [new Uint8Array(arrayBuffer, binStart + (bv.byteOffset || 0), bv.byteLength)],
        { type: img.mimeType }
      );
      return createImageBitmap(blob);
    })
  );

  const textureFor = (texInfo, srgb) => {
    const texDef = json.textures[texInfo.index];
    // Compressed-texture extensions relocate the image source reference.
    const source =
      texDef.extensions?.EXT_texture_webp?.source ??
      texDef.extensions?.KHR_texture_basisu?.source ??
      texDef.source;
    const tex = new THREE.Texture(bitmaps[source]);
    tex.flipY = false; // glTF convention
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  };

  // Patch the material instances actually attached to the scene's meshes —
  // parser caches can hand back instances the render never uses.
  const defFor = (material) => {
    if (json.materials.length === 1) return json.materials[0];
    const assoc = gltf.parser.associations?.get(material);
    const idx = assoc?.materials ?? assoc?.index;
    if (idx != null) return json.materials[idx];
    return json.materials.find((d) => d.name === material.name) || null;
  };

  const patched = new Set();
  gltf.scene.traverse((obj) => {
    if (!obj.isMesh || patched.has(obj.material)) return;
    const material = obj.material;
    patched.add(material);
    const def = defFor(material);
    if (!def) return;
    const pbr = def.pbrMetallicRoughness || {};
    if (!material.map && pbr.baseColorTexture) {
      material.map = textureFor(pbr.baseColorTexture, true);
    }
    if (!material.metalnessMap && pbr.metallicRoughnessTexture) {
      material.metalnessMap = material.roughnessMap = textureFor(pbr.metallicRoughnessTexture, false);
    }
    if (!material.normalMap && def.normalTexture) {
      material.normalMap = textureFor(def.normalTexture, false);
    }
    if (!material.emissiveMap && def.emissiveTexture) {
      material.emissiveMap = textureFor(def.emissiveTexture, true);
    }
    if (!material.aoMap && def.occlusionTexture) {
      material.aoMap = textureFor(def.occlusionTexture, false);
    }
    material.needsUpdate = true;
  });
}

/**
 * Owns the renderer, camera, lights and the loaded GLB.
 * After load the model is recentered on the world origin and measured, so
 * the camera rig can orbit it at a constant, aspect-aware radius and the
 * model stays dead-center in the viewport at every scroll position.
 */
export class Scene3D {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} cfg       this mount's resolved config (config.js)
   * @param {object} [source]  { modelUrl, modelData } — modelData is an
   *                           optional base64 GLB parsed from memory instead
   *                           of fetching modelUrl (for strict-CSP hosts).
   */
  constructor(canvas, cfg, source = {}) {
    this.canvas = canvas;
    this.cfg = cfg;
    this.modelUrl = source.modelUrl || cfg.MODEL_URL;
    this.modelData = source.modelData || null;
    this.disposed = false;

    // One-time capability guess; drives pixel-ratio ceiling, MSAA and whether
    // post-processing runs at all. The adaptive loop refines it from there.
    this.tier = detectDeviceTier();
    this.pixelRatioScale = 1;
    this.postfx = null;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      // Skipped when the composer will run — it renders to its own buffers
      // (with its own MSAA), so a multisampled default framebuffer would be
      // allocated and never used.
      antialias: TIER_PROFILE[this.tier].antialias && !postFXWanted(cfg, this.tier),
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(resolvePixelRatio(cfg, this.tier));
    // Accumulate render stats per FRAME rather than per render() call. The
    // composer issues several passes, and with the default autoReset the
    // counters would only ever show the last one — a fullscreen triangle —
    // which makes the tuner's draw-call/triangle readout useless exactly when
    // post-processing is on. render() resets them explicitly instead.
    this.renderer.info.autoReset = false;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);

    // Neutral studio lighting so the model reads clearly before any highlight.
    // (Same rig for clay and textured — the soft key/ground bounce is what
    // gives the untextured surfaces their sculpted contrast.)
    const hemi = new THREE.HemisphereLight(0xf4f6f8, 0x6b6b70, 1.15);
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(4, 6, 5);
    const rim = new THREE.DirectionalLight(0xdfe8ff, 0.9);
    rim.position.set(-5, 3, -4);
    this.scene.add(hemi, key, rim);

    // Filled in by load()
    this.model = null;
    this.bounds = null;      // THREE.Box3 of the centered model
    this.boundingRadius = 1; // bounding-sphere radius, drives orbit distance
    this.meshes = [];

    this.resize();
    // Size follows the canvas's own box, not the window, so the module can
    // live in any container. ResizeObserver also catches container changes
    // that never fire a window resize.
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
  }

  /** Load the GLB, recenter it on the origin, measure it. */
  load(onProgress) {
    const { MODEL_TRANSFORM, RENDER_MODE, CLAY } = this.cfg;
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);

    return new Promise((resolve, reject) => {
      const onLoaded = (gltf) => {
          const model = gltf.scene;
          // Unmounted while the GLB was still downloading: free it and stop.
          if (this.disposed) {
            disposeObject(model);
            reject(new Error('Hero3D was destroyed before the model loaded'));
            return;
          }

          // Align the source model with the camera convention (front on +Z)
          // BEFORE measuring, so bbox-normalized highlight regions line up.
          model.rotation.y = THREE.MathUtils.degToRad(MODEL_TRANSFORM.rotationY);
          model.updateMatrixWorld(true);

          // Center the model on the origin and sit it on y ~ centered too,
          // so lookAt(0,0,0) keeps it exactly mid-viewport.
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);

          this.bounds = new THREE.Box3().setFromObject(model);
          const sphere = this.bounds.getBoundingSphere(new THREE.Sphere());
          this.boundingRadius = sphere.radius;

          model.traverse((obj) => {
            if (obj.isMesh) {
              // Clone materials so highlight shader edits never leak between
              // meshes that share a material in the source file.
              obj.material = obj.material.clone();
              if (RENDER_MODE === 'clay') {
                const m = obj.material;
                m.map = m.normalMap = m.roughnessMap = null;
                m.metalnessMap = m.emissiveMap = m.aoMap = null;
                m.color.setHex(CLAY.color);
                m.emissive.setHex(0x000000);
                m.metalness = CLAY.metalness;
                m.roughness = CLAY.roughness;
                m.needsUpdate = true;
              }
              this.meshes.push(obj);
            }
          });

          this.model = model;
          this.scene.add(model);
          this.addContactShadow();
          resolve(model);
      };

      // Single-file/preview builds embed the GLB as base64 and parse it from
      // memory — strict CSPs (e.g. the Artifact host) block fetching data: URIs.
      const embedded = this.modelData;
      if (embedded) {
        const bytes = Uint8Array.from(atob(embedded), (c) => c.charCodeAt(0));
        loader.parse(
          bytes.buffer,
          '',
          async (gltf) => {
            // GLTFLoader loads a GLB's packed textures by fetch()ing blob:
            // URLs, which strict CSPs refuse — leaving materials untextured.
            // Recover them by decoding the image bytes in memory instead.
            try {
              await restoreBlockedTextures(gltf, bytes.buffer);
            } catch (err) {
              console.warn('Embedded texture recovery failed:', err);
            }
            onLoaded(gltf);
          },
          reject
        );
        return;
      }

      loader.load(
        this.modelUrl,
        onLoaded,
        (evt) => {
          if (onProgress && evt.total) onProgress(evt.loaded / evt.total);
        },
        reject
      );
    });
  }

  /**
   * Soft radial-gradient plane under the model — grounds it like a studio
   * shot without the cost of real shadow mapping. (Canvas-generated, so no
   * external asset and no CSP exposure.)
   */
  addContactShadow() {
    const size = this.bounds.getSize(new THREE.Vector3());
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(128, 128, 24, 128, 128, 128);
    grad.addColorStop(0, 'rgba(0,0,0,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthWrite: false,
      })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.scale.set(size.x * 1.9, size.z * 1.2, 1);
    plane.position.y = this.bounds.min.y - 0.01;
    this.scene.add(plane);
    this.contactShadow = plane;
  }

  /**
   * Convert a normalized bounding-box coordinate ([0..1] per axis, see
   * config.js) into world space. Lets highlight regions survive a model
   * swap unchanged.
   */
  normalizedToWorld([nx, ny, nz]) {
    const { min, max } = this.bounds;
    return new THREE.Vector3(
      THREE.MathUtils.lerp(min.x, max.x, nx),
      THREE.MathUtils.lerp(min.y, max.y, ny),
      THREE.MathUtils.lerp(min.z, max.z, nz)
    );
  }

  /** Attach the post-processing chain; render() starts routing through it. */
  attachPostFX(postfx) {
    this.postfx = postfx;
  }

  /**
   * Set the renderer's pixel ratio from the tier ceiling times an adaptive
   * scale. Split out from resize() because the adaptive loop changes the
   * scale without the canvas ever changing size.
   */
  applyPixelRatio(tier = this.tier, scale = this.pixelRatioScale) {
    this.pixelRatioScale = scale;
    this.renderer.setPixelRatio(resolvePixelRatio(this.cfg, tier, scale));
    // The composer's buffers are sized off the drawing buffer, so they have
    // to be rebuilt whenever the ratio moves.
    if (this.postfx) this.postfx.resize();
  }

  resize() {
    if (this.disposed) return;
    // The stage, not the window, is the fallback: the module may sit in a
    // container smaller than the viewport.
    const w = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 1;
    const h = this.canvas.clientHeight || this.canvas.parentElement?.clientHeight || 1;
    // Re-clamp every resize: devicePixelRatio changes when a phone rotates,
    // the browser zooms, or the window moves between screens.
    this.renderer.setPixelRatio(resolvePixelRatio(this.cfg, this.tier, this.pixelRatioScale));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.postfx) this.postfx.resize();
  }

  /**
   * Orbit radius that keeps the whole model framed with margin, corrected
   * for narrow viewports (uses the horizontal fov when it is the tighter fit).
   */
  framedRadius() {
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const fit = Math.min(vFov, hFov);
    return (this.boundingRadius / Math.sin(fit / 2)) * 1.06;
  }

  render(dt = 0) {
    if (this.disposed) return;
    this.renderer.info.reset();
    if (this.postfx && this.postfx.active) this.postfx.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  /** Free every GPU resource this scene owns and release the WebGL context. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    if (this.postfx) this.postfx.dispose();
    this.postfx = null;
    disposeObject(this.scene);
    this.scene.clear();
    this.meshes.length = 0;
    this.model = null;
    this.renderer.dispose();
    // Browsers cap live WebGL contexts per page; hand this one back now
    // rather than waiting for garbage collection.
    this.renderer.forceContextLoss();
  }
}

/** Dispose geometries, materials and every texture a material references. */
function disposeObject(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const materials = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value && value.isTexture) value.dispose();
      }
      material.dispose();
    }
  });
}
