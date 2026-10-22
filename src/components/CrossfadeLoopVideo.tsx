import { useEffect, useRef } from 'react'

interface CrossfadeLoopVideoProps {
  src: string
  /** Where the usable footage ends, in seconds (anything after it is never shown). */
  end: number
  /** Length of the dissolve from the end back into the start, in seconds. */
  fade?: number
  className?: string
}

/**
 * A background video that loops with a dissolve instead of a jump cut. Two copies of the clip are stacked; `fade`
 * seconds before `end`, the hidden copy starts from the beginning and fades in over the playing one, then the two
 * swap roles. Same URL for both, so the browser fetches the file once.
 */
export function CrossfadeLoopVideo({ src, end, fade = 1.2, className = '' }: CrossfadeLoopVideoProps) {
  const a = useRef<HTMLVideoElement>(null)
  const b = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const va = a.current
    const vb = b.current
    if (!va || !vb) return
    let front = va
    let back = vb
    let fading = false
    let raf = 0
    let timer = 0

    const show = (v: HTMLVideoElement, on: boolean, z: number, animate: boolean) => {
      v.style.transition = animate ? `opacity ${fade}s ease-in-out` : 'none'
      v.style.zIndex = String(z)
      v.style.opacity = on ? '1' : '0'
    }
    show(front, true, 1, false)
    show(back, false, 2, false)
    front.play().catch(() => {})

    const tick = () => {
      if (!fading && front.currentTime >= end - fade) {
        fading = true
        back.currentTime = 0
        back.play().catch(() => {})
        show(back, true, 2, true) // dissolve the start in on top of the ending
        timer = window.setTimeout(() => {
          front.pause()
          front.currentTime = 0
          show(front, false, 1, false)
          ;[front, back] = [back, front]
          show(front, true, 1, false)
          show(back, false, 2, false)
          fading = false
        }, fade * 1000)
      }
      // Never let the footage past `end` show, even if the dissolve is late (e.g. a background tab).
      if (front.currentTime >= end) front.currentTime = 0
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [end, fade])

  const cls = `absolute inset-0 h-full w-full object-cover ${className}`
  return (
    <>
      <video ref={a} aria-hidden muted playsInline preload="auto" className={cls} src={src} />
      <video ref={b} aria-hidden muted playsInline preload="auto" className={cls} src={src} style={{ opacity: 0 }} />
    </>
  )
}
