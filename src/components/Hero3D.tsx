import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useMotionValue, type MotionValue } from 'motion/react'
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
  /**
   * Optional React layer rendered inside the pinned stage, on top of the canvas. It receives the camera rig's
   * damped scroll progress (0..1), the same value that moves the truck, so anything it animates stays in step.
   */
  overlay?: (progress: MotionValue<number>) => ReactNode
}

type Rig = { progress: number }

/** React wrapper: mounts the portable Hero3D module into its own div and destroys it on unmount. */
export function Hero3D({ className, tuner = defaultTuner, config, overlay }: Hero3DProps) {
  const ref = useRef<HTMLDivElement>(null)
  const initialConfig = useRef(config)
  const progress = useMotionValue(0)
  const [stage, setStage] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const container = ref.current
    if (!container) return
    let instance: ReturnType<typeof mountHero3D> | null = null
    let cancelled = false
    let frame = 0
    // Mirror the rig's progress into a motion value every frame (cheap: no React render unless a consumer reacts).
    const pump = () => {
      const rig = instance?.handle?.rig as Rig | undefined
      if (rig && rig.progress !== progress.get()) progress.set(rig.progress)
      frame = requestAnimationFrame(pump)
    }
    const mount = (modelData?: string) => {
      if (cancelled) return
      instance = mountHero3D(container, {
        modelUrl: `${import.meta.env.BASE_URL}models/model.glb`,
        modelData,
        config: initialConfig.current,
        tuner,
      })
      setStage(instance.root.querySelector<HTMLElement>('.h3d__stage'))
      frame = requestAnimationFrame(pump)
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
      cancelAnimationFrame(frame)
      setStage(null)
      instance?.destroy()
    }
  }, [tuner, progress])

  return (
    <div ref={ref} className={className}>
      {stage && overlay && createPortal(overlay(progress), stage)}
    </div>
  )
}
