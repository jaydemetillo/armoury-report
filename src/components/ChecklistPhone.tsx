import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform, type MotionValue } from 'motion/react'

/**
 * The Armoury checklist on a phone, built from the Figma frame "test" (node 11:3356), pinned beside the 3D truck.
 *
 * Everything is driven by the truck's own scroll progress `p` (0..1), so the phone always matches the camera and
 * plays backwards when the reader scrolls up:
 *   right side  -> Q1 "Have you checked the lines?"        tapped YES (green)
 *   rear        -> list scrolls, Q2 "Is the fuel level…"   tapped YES (green)
 *   left side   -> list scrolls, Q3 "Did you check the battery health?" tapped NO (grey),
 *                  the energy field opens with a cursor, "600" is typed, then NO turns red.
 */

/** Beat thresholds on the truck's damped progress (see STEPS / CAMERA_KEYFRAMES in hero3d/config.js). */
const T = {
  q1Yes: 0.1,
  toQ2: 0.3,
  q2Yes: 0.44,
  toQ3: 0.62,
  q3No: 0.68,
  type1: 0.74,
  type2: 0.77,
  type3: 0.8,
}

// Figma variables (color/...) where the frame defines them; answer colours from the app screenshots.
const COLORS = {
  yes: '#3a786e', // selected YES, teal green from the app
  noGrey: '#474a52', // selected NO before the energy amount is entered
  noRed: '#b5413b', // selected NO once the amount is in
  segBg: '#ededed', // color/interaction/support/disabled
  segBorder: '#bfc2c8', // color/base/divider/strong
  idle: '#838894', // color/interaction/support/placeholder
  ink: '#454953', // color/base/content/default
  icon: '#666c7a', // color/base/content/medium
  focus: '#1361f0', // color/base/divider/brand
  header: '#272d41',
  tabIdle: '#a0a4ad', // color/interaction/support/disabled-content
  tabActive: '#5d6785', // color/interaction/sub/default
  screen: '#eef0f4',
}

interface PhoneState {
  q: 0 | 1 | 2
  q1: boolean
  q2: boolean
  q3: boolean
  typed: string
}

function derive(p: number): PhoneState {
  return {
    q: p >= T.toQ3 ? 2 : p >= T.toQ2 ? 1 : 0,
    q1: p >= T.q1Yes,
    q2: p >= T.q2Yes,
    q3: p >= T.q3No,
    typed: p >= T.type3 ? '600' : p >= T.type2 ? '60' : p >= T.type1 ? '6' : '',
  }
}

const same = (a: PhoneState, b: PhoneState) =>
  a.q === b.q && a.q1 === b.q1 && a.q2 === b.q2 && a.q3 === b.q3 && a.typed === b.typed

/* ---------------------------------------------------------------- icons (drawn, no icon package) */

const Check = ({ className = '' }) => (
  <svg viewBox="0 0 12 12" className={className} aria-hidden>
    <path d="M2.2 6.4 4.8 9 9.8 3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const Cross = ({ className = '' }) => (
  <svg viewBox="0 0 12 12" className={className} aria-hidden>
    <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)
const Pencil = () => (
  <svg viewBox="0 0 14 14" className="absolute top-1/2 right-0 h-[12.3px] w-[12.3px] -translate-y-1/2" style={{ color: COLORS.icon }} aria-hidden>
    <path d="M9.6 2.2l2.2 2.2-7.3 7.3H2.3V9.5zM8.4 3.4l2.2 2.2" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
)

/* ---------------------------------------------------------------- pieces (Figma sizes, node 11:3356) */

/** Soft circular ripple where the "finger" lands. Replays whenever `playKey` changes. */
function Ripple({ playKey, color }: { playKey: number; color: string }) {
  if (!playKey) return null
  return (
    <motion.span
      key={playKey}
      aria-hidden
      className="pointer-events-none absolute top-1/2 left-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style={{ background: color }}
      initial={{ scale: 0.2, opacity: 0.55 }}
      animate={{ scale: 2.6, opacity: 0 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    />
  )
}

function YesNo({ answer, noColor, tapKey }: { answer: 'yes' | 'no' | null; noColor: string; tapKey: number }) {
  const seg = (side: 'yes' | 'no') => {
    const on = answer === side
    const bg = on ? (side === 'yes' ? COLORS.yes : noColor) : 'transparent'
    return (
      <span
        className="relative flex h-[34.44px] flex-1 items-center justify-center gap-[4px] overflow-hidden rounded-[6.15px] text-[8.61px] font-bold tracking-[0.17px] uppercase transition-[background-color,color] duration-500"
        style={{ background: bg, color: on ? '#fff' : COLORS.idle }}
      >
        {side === 'yes' ? <Check className="h-[8px] w-[8px]" /> : <Cross className="h-[8px] w-[8px]" />}
        {side === 'yes' ? 'Yes' : 'No'}
        {on && <Ripple playKey={tapKey} color="rgb(255 255 255 / 0.45)" />}
      </span>
    )
  }
  return (
    <div
      className="flex h-[39.36px] gap-[2.46px] rounded-[4.92px] border-[0.615px] p-[2.46px]"
      style={{ background: COLORS.segBg, borderColor: COLORS.segBorder }}
      role="img"
      aria-label={answer ? `Answered ${answer}` : 'Not answered yet'}
    >
      {seg('yes')}
      {seg('no')}
    </div>
  )
}

function Card({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[4.92px] bg-white py-[9.84px]" style={{ paddingInline: PAD_X }}>
      <div className="relative mb-[8.61px] pr-[18px]">
        <span className="block text-[9px] leading-[14px] font-medium tracking-[-0.06px]" style={{ color: COLORS.ink }}>
          {q}
        </span>
        <Pencil />
      </div>
      {children}
    </div>
  )
}

/** "What's the energy amount?" field (from the app screenshots, sized to the Figma card): blue and focused with a
 * blinking cursor while typing, settled to the grey divider once the amount is in. */
function EnergyField({ typed }: { typed: string }) {
  const done = typed === '600'
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <div className="pt-[9.84px] text-[9px] leading-[14px] font-medium" style={{ color: COLORS.ink }}>
        What’s the energy amount?
      </div>
      <div
        className="mt-[6px] flex h-[30px] items-center rounded-[4.92px] border-[0.8px] bg-white px-[9px] transition-colors duration-300"
        style={{ borderColor: done ? COLORS.segBorder : COLORS.focus }}
      >
        <span className="text-[10px] tabular-nums" style={{ color: COLORS.ink }}>
          {typed}
        </span>
        {!done && <span aria-hidden className="ml-px h-[11px] w-[0.8px] animate-[cursor-blink_1s_steps(1)_infinite]" style={{ background: COLORS.ink }} />}
        <span className="ml-auto flex items-center gap-[12px] text-[13px] leading-none" style={{ color: COLORS.ink }}>
          <span aria-hidden>−</span>
          <span aria-hidden>+</span>
        </span>
      </div>
    </motion.div>
  )
}

/* ---------------------------------------------------------------- phone */

/** Figma "Patterned panel" (13:7136) size; the whole phone is drawn at this size and scaled to fit. */
/** Screen width set to 218px (Figma 239.84); every horizontal measure inside scales by the same ratio. */
const SCREEN_W = 218
const KX = SCREEN_W / 239.84
const SIDE = 23.74 * KX // space either side of the screen, for its shadow
const PHONE_W = SCREEN_W + SIDE * 2
const PHONE_H = 391
const SCREEN_TOP = 28.74
const SCREEN_H = 330.86
const PAD_X = 9.84 * KX

/** Checklist completion shown in the header: each YES moves it closer to 100%, the entered amount finishes it. */
const percentFor = (st: PhoneState) => (st.typed === '600' ? 100 : st.q2 ? 96 : st.q1 ? 93 : 90)

/** The header's percentage: the bar and the number glide to each new value. */
function Progress({ value }: { value: number }) {
  const v = useMotionValue(value)
  useEffect(() => {
    const c = animate(v, value, { duration: 0.8, ease: [0.22, 1, 0.36, 1] })
    return () => c.stop()
  }, [v, value])
  const width = useTransform(v, (n) => `${n}%`)
  const label = useTransform(v, (n) => `${Math.round(n)}%`)
  return (
    <div className="absolute top-[37.5px] flex items-center gap-[8px]" style={{ left: PAD_X, right: PAD_X }}>
      <div className="relative h-[2.46px] flex-1 overflow-hidden rounded-full bg-[#f5f5f5]">
        <motion.div className="h-full rounded-full" style={{ width, background: COLORS.focus }} />
      </div>
      <motion.span className="w-[26px] text-right text-[9.84px] leading-[14.76px] font-medium text-[#f5f5f5] tabular-nums">
        {label}
      </motion.span>
    </div>
  )
}

/**
 * `visibleH` (design px) is how much of the screen is actually on view. On phones the frame deliberately runs off the
 * bottom of the viewport; the list then scrolls the active card (and the energy field) up into the visible part,
 * while the frame itself stays where it is.
 */
export function ChecklistPhone({ progress, visibleH = SCREEN_H }: { progress: MotionValue<number>; visibleH?: number }) {
  const [s, setS] = useState<PhoneState>(() => derive(progress.get()))
  // Tap ripples: bump a key only when an answer goes from unanswered to answered while scrolling forward.
  const [taps, setTaps] = useState({ q1: 0, q2: 0, q3: 0 })
  const prev = useRef(s)

  useEffect(() => {
    const update = (p: number) => {
      const next = derive(p)
      if (same(next, prev.current)) return
      const before = prev.current
      setTaps((t) => ({
        q1: !before.q1 && next.q1 ? t.q1 + 1 : t.q1,
        q2: !before.q2 && next.q2 ? t.q2 + 1 : t.q2,
        q3: !before.q3 && next.q3 ? t.q3 + 1 : t.q3,
      }))
      prev.current = next
      setS(next)
    }
    update(progress.get())
    return progress.on('change', update)
  }, [progress])

  // Scroll the list toward the active question, but never past the end of the list: near the bottom it stops with
  // the last card at the bottom edge, so the earlier cards stay on screen above it instead of leaving empty space.
  // Re-measured whenever the list changes size (the energy field opening grows the last card).
  const viewport = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLDivElement | null)[]>([])
  const [listY, setListY] = useState(0)
  useLayoutEffect(() => {
    const measure = () => {
      const el = cards.current[s.q]
      const view = viewport.current
      const content = list.current
      if (!el || !view || !content) return
      const gap = 9.84
      // Only the on-screen part of the list counts, so the last card ends at the viewport edge on phones.
      const shown = Math.min(view.clientHeight, visibleH - 53.5)
      const maxScroll = Math.max(0, content.offsetHeight - shown)
      setListY(Math.min(Math.max(0, el.offsetTop - gap), maxScroll))
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (list.current) ro.observe(list.current)
    return () => ro.disconnect()
  }, [s.q, visibleH])

  const noColor = s.typed === '600' ? COLORS.noRed : COLORS.noGrey

  return (
    // Just the app screen, no device frame or logo. The Figma panel's (13:7136) size is kept as breathing room
    // around the screen so its shadow has space.
    <div className="relative font-ui" style={{ width: PHONE_W, height: PHONE_H }}>
      {/* App screen (Figma 11:4878) */}
      <div
        className="absolute overflow-hidden rounded-[20px] shadow-[0_18px_40px_-12px_rgb(0_0_0/0.55),0_4px_12px_rgb(0_0_0/0.25)]"
        // Dark base: the light screen colour only sits under the list, so no pale hairline shows around the
        // header's rounded top corners.
        style={{ background: COLORS.header, top: SCREEN_TOP, left: SIDE, width: SCREEN_W, height: SCREEN_H }}
      >
        {/* Tabs + progress header */}
        <div className="absolute inset-x-0 top-0 z-10 h-[53.5px]" style={{ background: COLORS.header }}>
          <div className="flex h-[39.36px] items-center text-[9.84px] leading-[14.76px] font-medium tracking-[-0.06px] whitespace-nowrap" style={{ gap: 19.68 * KX, paddingInline: PAD_X }}>
            <span style={{ color: COLORS.tabIdle }}>Odometer</span>
            <span className="flex h-[18.45px] items-center rounded-[4.92px] text-white" style={{ background: COLORS.tabActive, paddingInline: PAD_X }}>
              Vehicle equipment
            </span>
            <span style={{ color: COLORS.tabIdle }}>Safety checks</span>
          </div>
          <Progress value={percentFor(s)} />
        </div>

        {/* Question list (Figma 11:4879), scrolled so the active question sits under the header */}
        <div ref={viewport} className="absolute inset-x-0 top-[53.5px] bottom-0 overflow-hidden" style={{ background: COLORS.screen, paddingInline: PAD_X }}>
          <div
            ref={list}
            className="flex flex-col gap-[9.84px] pt-[9.84px] pb-[9.84px] drop-shadow-[0_0_3px_rgba(191,191,191,0.5)] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateY(${-listY}px)` }}
          >
            <div ref={(el) => { cards.current[0] = el }}>
              <Card q="Have you checked the lines?">
                <YesNo answer={s.q1 ? 'yes' : null} noColor={COLORS.noGrey} tapKey={taps.q1} />
              </Card>
            </div>
            <div ref={(el) => { cards.current[1] = el }}>
              <Card q="Is the fuel level at least 75%?">
                <YesNo answer={s.q2 ? 'yes' : null} noColor={COLORS.noGrey} tapKey={taps.q2} />
              </Card>
            </div>
            <div ref={(el) => { cards.current[2] = el }}>
              <Card q="Did you check the battery health?">
                <YesNo answer={s.q3 ? 'no' : null} noColor={noColor} tapKey={taps.q3} />
                {s.q3 && <EnergyField typed={s.typed} />}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const CHECKLIST_PHONE_SIZE = { width: PHONE_W, height: PHONE_H }

/**
 * Places and scales the phone inside the 3D stage.
 *   Desktop (stage >= STACK_BELOW wide): right side, vertically centred, as large as fits (the truck is nudged left
 *   via its framing offset).
 *   Mobile: centred under the truck, starting just past the middle of the screen; the phone runs off the bottom
 *   edge on purpose so its screen stays large and readable instead of shrinking to fit whole.
 */
/** Stage width below which the phone stacks under the truck. */
export const STACK_BELOW = 900

export function ChecklistPhoneOverlay({ progress }: { progress: MotionValue<number> }) {
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Stacked below 900px wide (phones and portrait tablets); side by side otherwise, including short landscape phones.
  // Must match CAMERA_SETTINGS.framing.compactBelowWidth / compactBelowHeight passed to <Hero3D> in App.tsx.
  const compact = size.w < STACK_BELOW
  const scale = compact
    ? Math.min(1.35, (size.w * 0.9) / PHONE_W)
    : Math.min(1.45, (size.h * 0.86) / PHONE_H, (size.w * 0.3) / PHONE_W)
  const w = PHONE_W * scale
  const h = PHONE_H * scale
  // Phones: the frame starts just past the middle and runs off the bottom on purpose. Tell the phone how much of its
  // screen is visible (less a 16px margin) so the list scrolls the active card into that part.
  const visibleH = compact && size.h
    ? Math.max(200, Math.min(SCREEN_H, (size.h - size.h * 0.49 - 16) / scale - SCREEN_TOP))
    : SCREEN_H
  const style = compact
    ? { left: (size.w - w) / 2, top: size.h * 0.49 }
    : { left: size.w - w - Math.max(32, size.w * 0.07), top: (size.h - h) / 2 }

  // Give the 3D truck only the space the phone leaves free: left of it on desktop, above it on mobile. The module
  // auto-fits the truck to its canvas, so it is centred in that space (vertically level with the phone on desktop)
  // and can never run underneath the phone, at any screen size.
  useLayoutEffect(() => {
    const canvas = box.current?.parentElement?.querySelector<HTMLCanvasElement>('.h3d__canvas')
    if (!canvas || !size.w) return
    const gap = 16
    if (compact) {
      Object.assign(canvas.style, { inset: 'auto', left: '0', top: '0', width: '100%', height: `${Math.max(160, style.top - gap)}px` })
    } else {
      Object.assign(canvas.style, { inset: 'auto', left: '0', top: '0', height: '100%', width: `${Math.max(240, style.left - gap)}px` })
    }
    return () => {
      Object.assign(canvas.style, { inset: '', left: '', top: '', width: '', height: '' })
    }
  }, [compact, size.w, style.left, style.top])

  return (
    <div ref={box} className="pointer-events-none absolute inset-0 z-[3]">
      {size.w > 0 && (
        <div className="absolute" style={{ ...style, width: w, height: h }}>
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <ChecklistPhone progress={progress} visibleH={visibleH} />
          </div>
        </div>
      )}
    </div>
  )
}
