let cached: boolean | null = null

/** True when the browser can create a WebGL context. Checked once and cached. */
export function hasWebGL() {
  if (cached !== null) return cached
  try {
    const canvas = document.createElement('canvas')
    cached = !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    cached = false
  }
  return cached
}
