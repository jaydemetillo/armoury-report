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
    if (!ref.current) return
    const instance = mountHero3D(ref.current, {
      modelUrl: `${import.meta.env.BASE_URL}models/model.glb`,
      config: initialConfig.current,
      tuner,
    })
    return () => instance.destroy()
  }, [tuner])

  return <div ref={ref} className={className} />
}
