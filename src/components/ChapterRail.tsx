import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { chapters } from '@/components/Masthead'

/** Springy overshoot, the same curve as the liquid-gooey reference. */
const GOO_EASE = [0.34, 1.56, 0.64, 1] as const
/** How long the rail stays after the reader stops scrolling. */
const IDLE_MS = 1200

/**
 * Chapter dots pinned to the right edge, desktop (`lg`) and up only. Smaller screens use the masthead's menu instead.
 * The current chapter stretches into a red pill, and the rail fades out when the reader pauses. Tapping a dot gives it a small liquid wobble: a droplet pulls
 * out of the dot and snaps back, fused by an SVG "goo" filter. Each dot has its own filter, so dots never merge.
 */
export function ChapterRail() {
  const reduce = useReducedMotion()
  const [active, setActive] = useState(-1)
  const [pastHero, setPastHero] = useState(false)
  // Awake while the reader scrolls or touches the rail; fades out once they pause.
  const [awake, setAwake] = useState(false)
  const [taps, setTaps] = useState<number[]>(() => chapters.map(() => 0))
  const [label, setLabel] = useState<number | null>(null)
  const labelTimer = useRef(0)
  const sleepTimer = useRef(0)
  const hovering = useRef(false)

  const wake = () => {
    setAwake(true)
    clearTimeout(sleepTimer.current)
    sleepTimer.current = window.setTimeout(() => {
      if (!hovering.current) setAwake(false)
    }, IDLE_MS)
  }

  useEffect(() => {
    let frame = 0
    let first = true
    const update = () => {
      frame = 0
      const line = window.innerHeight * 0.4
      let current = -1
      chapters.forEach(([href], i) => {
        const el = document.querySelector(href)
        if (el && el.getBoundingClientRect().top <= line) current = i
      })
      setActive(current)
      setPastHero(window.scrollY > window.innerHeight * 0.6)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
      if (!first) wake()
    }
    update()
    first = false
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      clearTimeout(labelTimer.current)
      clearTimeout(sleepTimer.current)
    }
  }, [])

  const go = (i: number) => {
    wake()
    setTaps((t) => t.map((n, j) => (j === i ? n + 1 : n)))
    setLabel(i)
    clearTimeout(labelTimer.current)
    labelTimer.current = window.setTimeout(() => setLabel(null), 1400)
    document.querySelector(chapters[i][0])?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const visible = pastHero && awake

  return (
    <motion.nav
      aria-label="Chapters"
      // Desktop only (below lg the masthead's menu takes over). Dots sit 32px in from the right edge: 16px clear of an overlay scrollbar (about 16px wide), in the page margin.
      className="fixed top-1/2 right-[23px] z-40 hidden -translate-y-1/2 lg:block"
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: visible ? 0.35 : 0.8, ease: 'easeInOut' }}
      style={{ pointerEvents: pastHero ? 'auto' : 'none' }}
      onPointerEnter={() => {
        hovering.current = true
        wake()
      }}
      onPointerLeave={() => {
        hovering.current = false
        wake()
      }}
      onFocus={wake}
    >
      <svg aria-hidden width="0" height="0" className="absolute">
        <filter id="chapter-goo" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" />
        </filter>
      </svg>
      <ol className="m-0 flex list-none flex-col p-0">
        {chapters.map(([href, name], i) => {
          const on = i === active
          const fill = on ? 'bg-[var(--accent)]' : 'bg-muted'
          return (
            <li key={href} className="relative">
              <AnimatePresence>
                {label === i && (
                  <motion.span
                    className="pointer-events-none absolute top-1/2 right-full mr-1 -translate-y-1/2 rounded-full bg-ink px-3 py-1 text-[14px] whitespace-nowrap text-white"
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.2 }}
                  >
                    {name}
                  </motion.span>
                )}
              </AnimatePresence>
              <button
                type="button"
                aria-label={name}
                aria-current={on ? 'location' : undefined}
                onClick={() => go(i)}
                // Row height follows the screen height, so the rail fits short landscape phones as well as tall ones.
                className="relative flex h-[clamp(22px,4.5svh,36px)] w-6 cursor-pointer items-center justify-center rounded-full"
              >
                {/* Blurred then thresholded, so the dot and its droplet fuse like liquid. Opacity is applied after
                    the filter, which keeps the inactive dots soft. */}
                <span
                  aria-hidden
                  className="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
                  style={{ filter: 'url(#chapter-goo)', opacity: on ? 1 : 0.35 }}
                >
                  <motion.span
                    key={`dot-${taps[i]}`}
                    className={`block w-1.5 rounded-full transition-colors duration-500 ${fill}`}
                    initial={false}
                    animate={
                      reduce || taps[i] === 0
                        ? { height: on ? 20 : 6 }
                        : { height: on ? 20 : 6, scaleX: [1, 1.35, 0.9, 1], scaleY: [1, 0.85, 1.08, 1] }
                    }
                    transition={{ height: { duration: 0.55, ease: GOO_EASE }, default: { duration: 0.55, ease: 'easeOut' } }}
                  />
                  {!reduce && taps[i] > 0 && (
                    <motion.span
                      key={`drop-${taps[i]}`}
                      className={`absolute h-1 w-1 rounded-full ${fill}`}
                      initial={{ y: 0, scale: 0.9 }}
                      animate={{ y: [0, -7, 0], scale: [0.9, 0.6, 0.9] }}
                      transition={{ duration: 0.55, ease: GOO_EASE, times: [0, 0.4, 1] }}
                    />
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </motion.nav>
  )
}
