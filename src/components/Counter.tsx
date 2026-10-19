import { useEffect, useRef } from 'react'
import { animate, useInView } from 'motion/react'

interface CounterProps {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}

/** Counts up to `value` when it first scrolls into view, then tweens between later values. */
export function Counter({ value, decimals = 0, prefix = '', suffix = '', duration = 1.4, className }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const from = useRef(0)
  const format = (n: number) =>
    prefix + n.toLocaleString('en-SG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix

  useEffect(() => {
    if (!inView || !ref.current) return
    const node = ref.current
    const controls = animate(from.current, value, {
      duration,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (v) => {
        from.current = v
        node.textContent = format(v)
      },
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, duration])

  return (
    <span ref={ref} className={className}>
      {format(inView ? from.current : 0)}
    </span>
  )
}
