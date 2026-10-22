import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'

interface RevealLineProps {
  /** The line draws once this is true *and* it is on screen, so it is always seen growing, never drawn off-screen. */
  show: boolean
  /** Any CSS colour or variable. Defaults to the accent red. */
  color?: string
  className?: string
}

/**
 * Reveal line: a thin vertical rule that draws itself from top to bottom, smoothly, the first time `show` is true while
 * it is in view. Put it inside a `relative` block (it fills the block's height along its left edge) and reserve space
 * with left padding. Used on the journey's "What changed" blocks as the truck arrives; reusable anywhere a rule
 * should "arrive".
 */
export function RevealLine({ show, color = 'var(--accent)', className = '' }: RevealLineProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  // Watch the full-height wrapper (the inner line is scaled to nothing before it draws).
  const visible = useInView(ref, { amount: 0.3 })
  const draw = reduce || (show && visible)

  return (
    <span ref={ref} aria-hidden className={`pointer-events-none absolute top-0 bottom-0 left-0 w-[2px] ${className}`}>
      <motion.span
        className="block h-full w-full origin-top"
        style={{ background: color }}
        initial={{ scaleY: reduce ? 1 : 0 }}
        animate={{ scaleY: draw ? 1 : undefined }}
        transition={{ duration: 1.4, ease: [0.45, 0, 0.2, 1], delay: 0.1 }}
      />
    </span>
  )
}
