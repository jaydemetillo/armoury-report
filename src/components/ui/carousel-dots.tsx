/**
 * CarouselDots — stand-in written against the Fluid Functionalism API
 * (https://www.fluidfunctionalism.com/docs/carousel-dots).
 *
 * The registry was unreachable from the build environment, so this file
 * mirrors the documented props. Replace it with the original by running:
 *   npx shadcn@latest add https://www.fluidfunctionalism.com/r/carousel-dots.json --overwrite
 */
import { useEffect, useRef, useState } from 'react'
import {
  animate,
  isMotionValue,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { cn } from '@/lib/utils'

type Autoplay = boolean | { duration?: number; paused?: boolean; loop?: boolean }

export interface CarouselDotsProps {
  count: number
  value: number
  onValueChange: (index: number) => void
  autoplay?: Autoplay
  progress?: number | MotionValue<number>
  getLabel?: (index: number) => string
  className?: string
}

const DOT = 8
const PILL = 28
const spring = { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 } as const

export function CarouselDots({
  count,
  value,
  onValueChange,
  autoplay = false,
  progress,
  getLabel = (index) => `Go to slide ${index + 1}`,
  className,
}: CarouselDotsProps) {
  const reduce = useReducedMotion()
  const internal = useMotionValue(1)
  const fill = isMotionValue(progress) ? progress : internal
  const scaleX = useTransform(fill, (v) => Math.min(1, Math.max(0, v)))
  const [hovered, setHovered] = useState<number | null>(null)

  const onChange = useRef(onValueChange)
  useEffect(() => {
    onChange.current = onValueChange
  })

  const config = autoplay
    ? { duration: 3000, paused: false, loop: true, ...(autoplay === true ? {} : autoplay) }
    : null
  const running = config !== null && !reduce && progress === undefined
  const duration = config?.duration ?? 3000
  const paused = config?.paused ?? false
  const loop = config?.loop ?? true

  // A number passed as progress drives the fill directly.
  useEffect(() => {
    if (typeof progress === 'number') internal.set(progress)
  }, [progress, internal])

  // Static mode shows a solid pill.
  useEffect(() => {
    if (!running && progress === undefined) internal.set(1)
  }, [running, progress, internal])

  const lastValue = useRef<number | null>(null)
  useEffect(() => {
    if (!running) return
    if (lastValue.current !== value) {
      internal.set(0)
      lastValue.current = value
    }
    if (paused) return
    const remaining = Math.max(0, 1 - internal.get()) * (duration / 1000)
    const controls = animate(internal, 1, {
      duration: remaining,
      ease: 'linear',
      onComplete: () => {
        const next = value + 1
        if (next < count) onChange.current(next)
        else if (loop) onChange.current(0)
      },
    })
    return () => controls.stop()
  }, [running, value, paused, duration, loop, count, internal])

  return (
    <div
      role="group"
      aria-label="Slides"
      className={cn('relative inline-flex items-center', className)}
      onPointerLeave={() => setHovered(null)}
    >
      {Array.from({ length: count }, (_, index) => {
        const current = index === value
        return (
          <button
            key={index}
            type="button"
            aria-label={getLabel(index)}
            aria-current={current ? 'true' : undefined}
            onClick={() => onChange.current(index)}
            onPointerEnter={() => setHovered(index)}
            onFocus={() => setHovered(index)}
            onBlur={() => setHovered(null)}
            className="relative flex h-8 cursor-pointer items-center justify-center px-[5px] outline-none"
          >
            {hovered === index && (
              <motion.span
                layoutId="carousel-dots-hover"
                className="absolute inset-y-1 inset-x-0 rounded-full bg-current/12"
                transition={spring}
              />
            )}
            <motion.span
              className={cn(
                'relative block h-2 overflow-hidden rounded-full',
                current ? 'bg-current/30' : 'bg-current/45',
              )}
              initial={false}
              animate={{ width: current ? PILL : DOT }}
              transition={reduce ? { duration: 0 } : spring}
            >
              {current && (
                <motion.span
                  className="absolute inset-0 origin-left rounded-full bg-current"
                  style={{ scaleX }}
                />
              )}
            </motion.span>
          </button>
        )
      })}
    </div>
  )
}
