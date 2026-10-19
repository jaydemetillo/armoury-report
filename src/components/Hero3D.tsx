import { useEffect, useRef } from 'react'
import { mountHero3D, type Hero3DOptions } from '@/modules/hero3d'

/**
 * The tuner is available in development (via ?tune or Alt+Shift+T) and off in
 * production builds, unless the build sets VITE_HERO3D_TUNER=true.
 */
const defaultTuner: Hero3DOptions['tuner'] =
  import.meta.env.DEV || import.meta.env.VITE_HERO3D_TUNER === 'true' ? 'auto' : false

interface Hero3DProps {
  className?: string
  tuner?: Hero3DOptions['tuner']
  /** Per-mount overrides of src/modules/hero3d/config.js. Read once on mount. */
  config?: Hero3DOptions['config']
}

/** React wrapper: mounts the portable Hero3D module into its own div and destroys it on unmount. */
export function Hero3D({ className, tuner = defaultTuner, config }: Hero3DProps) {
  const ref = useRef<HTMLDivElement>(null)
  const initialConfig = useRef(config)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    let instance: ReturnType<typeof mountHero3D> | null = null
    let cancelled = false
    const mount = (modelData?: string) => {
      if (cancelled) return
      instance = mountHero3D(container, {
        modelUrl: `${import.meta.env.BASE_URL}models/model.glb`,
        modelData,
        config: initialConfig.current,
        tuner,
      })
    }
    // Hosts that refuse to serve .glb files (e.g. preview hosting) can ship the
    // model as base64 text instead: build with VITE_HERO3D_MODEL_BASE64=<url>.
    const base64Url = import.meta.env.VITE_HERO3D_MODEL_BASE64
    if (base64Url) {
      fetch(`${import.meta.env.BASE_URL}${base64Url}`)
        .then((r) => r.text())
        .then((text) => mount(text.trim()))
        .catch(() => mount())
    } else {
      mount()
    }
    return () => {
      cancelled = true
      instance?.destroy()
    }
  }, [tuner])

  return <div ref={ref} className={className} />
}
