import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'motion/react'

export const chapters = [
  ['#top', 'Origin'],
  ['#problem', 'Paper'],
  ['#change', 'Change'],
  ['#decision', 'Decision'],
  ['#last-mile', 'Last mile'],
  ['#lessons', 'What worked'],
  ['#conclusion', 'Conclusion'],
] as const

/** Index of the chapter whose top has passed 40% of the viewport, or -1 before the first one. */
function currentChapter() {
  const line = window.innerHeight * 0.4
  let current = -1
  chapters.forEach(([href], i) => {
    const el = document.querySelector(href)
    if (el && el.getBoundingClientRect().top <= line) current = i
  })
  return current
}

export function Masthead() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.3 })
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState(-1)
  const bar = useRef<HTMLDivElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)

  // Desktop only: once the reader scrolls down, the bar slides away (the chapter dots take over navigation). It comes
  // back at the top of the page and at the closing "Every check matters." photo. Phones and tablets keep it, since
  // their chapter menu lives in it.
  const [hidden, setHidden] = useState(false)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    let frame = 0
    const update = () => {
      frame = 0
      const closing = document.getElementById('closing')
      const atEnd = !!closing && closing.getBoundingClientRect().top < window.innerHeight * 0.75
      setHidden(desktop.matches && window.scrollY > 80 && !atEnd)
    }
    const onChange = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onChange, { passive: true })
    window.addEventListener('resize', onChange)
    // Crossing the desktop breakpoint updates at once, so a resized window never keeps the bar hidden on mobile.
    desktop.addEventListener('change', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
      desktop.removeEventListener('change', update)
    }
  }, [])

  // Close on Escape, on a tap outside the bar, or when the viewport grows into the desktop layout.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggle.current?.focus()
      }
    }
    const onDown = (e: PointerEvent) => {
      if (!bar.current?.contains(e.target as Node)) setOpen(false)
    }
    const desktop = window.matchMedia('(min-width: 1024px)')
    const onDesktop = () => desktop.matches && setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    desktop.addEventListener('change', onDesktop)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
      desktop.removeEventListener('change', onDesktop)
    }
  }, [open])

  // The jump waits until the menu has finished collapsing: a scroll started while it animates gets cancelled.
  const pending = useRef<string | null>(null)
  const goTo = (e: MouseEvent, href: string) => {
    e.preventDefault()
    pending.current = href
    setOpen(false)
  }
  const jump = () => {
    const href = pending.current
    pending.current = null
    if (!href) return
    history.replaceState(null, '', href)
    document.querySelector(href)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const openMenu = () => {
    setCurrent(currentChapter())
    setOpen((o) => !o)
  }

  return (
    <div
      ref={bar}
      // Keyboard users tabbing into the bar always get it back.
      onFocus={() => setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setFocused(false)}
      className={`sticky top-0 z-40 bg-[#004b93] font-sans font-normal text-white transition-transform ease-[cubic-bezier(0.4,0,0.2,1)] ${
        reduce ? 'duration-0' : 'duration-300'
      } ${hidden && !focused ? '-translate-y-[calc(100%+2px)]' : 'translate-y-0'}`}
    >
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-4 py-4 sm:px-8">
        <a href="#top" className="flex items-center no-underline">
          <img
            src={`${import.meta.env.BASE_URL}figma/armoury-logo.svg`}
            alt="Armoury"
            width={217}
            height={48}
            className="block h-[30px] w-auto"
          />
        </a>
        <nav aria-label="Chapters" className="hidden gap-5 text-[14px] lg:flex">
          {chapters.map(([href, label]) => (
            <a key={href} href={href} className="text-white no-underline transition-opacity hover:opacity-75">
              {label}
            </a>
          ))}
        </nav>
        {/* Below the desktop layout the chapter links fold into this menu. 44px target, pulled into the 62px bar. */}
        <button
          ref={toggle}
          type="button"
          aria-label={open ? 'Close chapters menu' : 'Open chapters menu'}
          aria-expanded={open}
          aria-controls="chapter-menu"
          onClick={openMenu}
          className="-my-[7px] -mr-[10px] flex h-11 w-11 cursor-pointer items-center justify-center rounded-full lg:hidden"
        >
          <span aria-hidden className="relative block h-[14px] w-[22px]">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="absolute left-0 block h-[2px] w-full rounded-full bg-white"
                style={{ top: i * 6 }}
                initial={false}
                animate={
                  open
                    ? i === 1
                      ? { opacity: 0, scaleX: 0.4 }
                      : { y: i === 0 ? 6 : -6, rotate: i === 0 ? 45 : -45 }
                    : { y: 0, rotate: 0, opacity: 1, scaleX: 1 }
                }
                transition={{ duration: reduce ? 0 : 0.28, ease: [0.4, 0, 0.2, 1] }}
              />
            ))}
          </span>
        </button>
      </div>
      <AnimatePresence onExitComplete={jump}>
        {open && (
          <motion.nav
            id="chapter-menu"
            aria-label="Chapters"
            className="absolute inset-x-0 top-full overflow-hidden bg-[#004b93] shadow-[0_12px_24px_rgba(0,0,0,0.18)] lg:hidden"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: reduce ? 0 : 0.32, ease: [0.4, 0, 0.2, 1] }}
          >
            <ol className="m-0 mx-auto max-w-[1240px] list-none border-t border-white/15 px-4 py-2 sm:px-8">
              {chapters.map(([href, label], i) => (
                <motion.li
                  key={href}
                  className="border-b border-white/10 last:border-b-0"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduce ? 0 : 0.25, delay: reduce ? 0 : 0.04 * i + 0.06 }}
                >
                  <a
                    href={href}
                    aria-current={i === current ? 'location' : undefined}
                    onClick={(e) => goTo(e, href)}
                    className="flex min-h-11 items-center gap-3 text-[16px] text-white no-underline"
                  >
                    <span className="w-6 text-[14px] text-white/55 tabular">{String(i + 1).padStart(2, '0')}</span>
                    <span className={i === current ? 'font-semibold' : 'text-white/85'}>{label}</span>
                    {i === current && <span className="ml-auto text-[14px] text-white/55">You’re here</span>}
                  </a>
                </motion.li>
              ))}
            </ol>
          </motion.nav>
        )}
      </AnimatePresence>
      <motion.div
        className="absolute bottom-[-1px] left-0 h-[2px] w-full origin-left bg-[var(--accent)]"
        style={{ scaleX: progress }}
      />
    </div>
  )
}
