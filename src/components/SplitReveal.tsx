import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { splitText, type TextSplit } from 'kugiri'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'

type Variant = 'lines' | 'words'

interface SplitRevealProps {
  as?: ElementType
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** `lines` slides whole lines up from a mask (titles); `words` rises word by word (pull quotes). */
  variant?: Variant
  /** `load` plays once fonts are ready; `view` waits until the text scrolls in. */
  trigger?: 'load' | 'view'
  delay?: number
  stagger?: number
  duration?: number
  /** Change to replay the reveal (wired to DialKit's "Replay" action). */
  replayKey?: number
}

const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

function split(el: HTMLElement, variant: Variant): TextSplit {
  return variant === 'lines'
    ? splitText(el, { type: ['lines'], mask: { lines: '.18em' } })
    : splitText(el, { type: ['words'], mask: { lines: '.18em' } })
}

function play(s: TextSplit, variant: Variant, delay: number, stagger: number, duration: number) {
  const units = variant === 'lines' ? s.lines : s.words
  const frames: Keyframe[] =
    variant === 'lines'
      ? [
          { transform: 'translateY(105%) rotate(2deg)', opacity: 0 },
          { transform: 'none', opacity: 1 },
        ]
      : [
          { transform: 'translateY(90%)', opacity: 0, filter: 'blur(6px)' },
          { transform: 'none', opacity: 1, filter: 'blur(0)' },
        ]
  const animations = units.map((unit, index) =>
    unit.animate(frames, {
      duration,
      delay: delay + index * stagger,
      easing: EASE,
      fill: 'backwards',
    }),
  )
  // Masks clip at rest too, so drop the clip once the reveal is over.
  Promise.all(animations.map((a) => a.finished))
    .then(() => {
      for (const mask of s.masks) mask.style.clipPath = 'none'
    })
    .catch(() => {})
}

/**
 * Text revealed along the lines the browser actually painted, split with kugiri.
 * The split is a snapshot, so it is redone (without replaying) when the width changes.
 */
export function SplitReveal({
  as: Tag = 'div',
  children,
  className,
  style,
  variant = 'lines',
  trigger = 'view',
  delay = 0,
  stagger = variant === 'lines' ? 110 : 34,
  duration = variant === 'lines' ? 1100 : 900,
  replayKey = 0,
}: SplitRevealProps) {
  const ref = useRef<HTMLElement>(null)
  const reduce = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || reduce) return

    let current: TextSplit | null = null
    let cancelled = false
    let frame = 0
    let width = el.clientWidth
    el.dataset.reveal = 'pending'

    const resize = new ResizeObserver(() => {
      if (!current || el.clientWidth === width) return
      width = el.clientWidth
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        current?.revert()
        current = split(el, variant)
        for (const mask of current.masks) mask.style.clipPath = 'none'
      })
    })

    const reveal = () => {
      if (cancelled) return
      current = split(el, variant)
      width = el.clientWidth
      el.dataset.reveal = 'done'
      play(current, variant, delay, stagger, duration)
      resize.observe(el)
    }

    let view: IntersectionObserver | null = null
    document.fonts.ready.then(() => {
      if (cancelled) return
      if (trigger === 'load') return reveal()
      view = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            view?.disconnect()
            reveal()
          }
        },
        { rootMargin: '0px 0px -15% 0px' },
      )
      view.observe(el)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      view?.disconnect()
      resize.disconnect()
      current?.revert()
      delete el.dataset.reveal
    }
  }, [variant, trigger, delay, stagger, duration, replayKey, reduce])

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  )
}
