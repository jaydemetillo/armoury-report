import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { SplitReveal } from '@/components/SplitReveal'

const versions = [
  {
    v: 'V1',
    name: 'Broad overview',
    feedback: 'Too generic. Users didn’t know what to focus on.',
    tiles: ['grey', 'grey', 'grey', 'grey', 'grey', 'grey', 'grey', 'grey', 'grey'],
  },
  {
    v: 'V2',
    name: 'Tailored to each department',
    feedback: 'Better, but it still took too much digging.',
    tiles: ['grey', 'ink', 'grey', 'ink', 'grey', 'grey', 'ink', 'grey', 'grey'],
  },
  {
    v: 'V3',
    name: 'Red / green readiness',
    feedback: 'Divisional users could finally hold stations accountable.',
    tiles: ['green', 'green', 'red', 'green', 'green', 'green', 'green', 'red', 'green'],
  },
] as const

const tileColor = { grey: '#cfc8ba', ink: '#6f6a60', green: '#1f8a5b', red: 'var(--accent)' }

export function DashboardIterations() {
  const [i, setI] = useState(2)
  const ver = versions[i]
  // Parallax: the photo is taller than its frame and drifts a little slower than the page as it scrolls past.
  const hero = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: hero, offset: ['start end', 'end start'] })
  const photoY = useTransform(scrollYProgress, [0, 1], ['-7%', '7%'])
  return (
    <section aria-label="Show the decision, not the data" className="relative mt-0 bg-white">
      {/* Photo hero: the station photo under the headline, fading into white where the dashboards begin. */}
      <div ref={hero} className="relative h-[min(92svh,900px)] min-h-[560px] overflow-hidden">
        <motion.img
          src={`${import.meta.env.BASE_URL}images/station-pointing-check.jpg`}
          alt="Two firefighters in orange helmets checking the open equipment lockers of a Fire and Rescue Response engine"
          className="absolute inset-x-0 top-[-9%] h-[118%] w-full object-cover object-[50%_45%] will-change-transform"
          style={reduce ? undefined : { y: photoY }}
        />
        <div aria-hidden className="absolute inset-0 bg-black/40" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 via-60% to-transparent" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-b from-transparent to-white" />
        <div className="relative mx-auto flex h-full max-w-[1240px] items-center justify-center px-5 pb-20 text-center sm:px-8">
          <SplitReveal
            as="h2"
            variant="words"
            trigger="view"
            className="display m-0 mx-auto max-w-[14ch] text-white"
            style={{ fontSize: 'clamp(3rem, 9vw, 96px)' }}
          >
            Show the decision, not the data
          </SplitReveal>
        </div>
      </div>
      <figure className="relative mx-auto mt-8 max-w-[860px] px-5 pb-20">
      <div className="grid items-center gap-8 rounded-[20px] bg-paper-2/60 p-6 sm:grid-cols-[220px_1fr] sm:p-8">
        <div className="grid grid-cols-3 gap-2" aria-hidden>
          {ver.tiles.map((t, k) => (
            <motion.div
              key={k}
              className="aspect-square rounded-md"
              animate={{ background: tileColor[t] }}
              transition={{ duration: 0.4, delay: k * 0.04 }}
            />
          ))}
        </div>
        <div>
          <div className="mb-4 flex gap-2">
            {versions.map((x, k) => (
              <button
                key={x.v}
                onClick={() => setI(k)}
                aria-pressed={i === k}
                className={`cursor-pointer rounded-full border px-4 py-1 text-[16px] font-medium transition-colors ${
                  i === k ? 'border-ink bg-ink text-white' : 'border-rule bg-transparent text-ink-2 hover:border-ink'
                }`}
              >
                {x.v}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <div className="font-serif text-[30px] leading-tight">{ver.name}</div>
              <p className="m-0 mt-2 text-[16px] text-ink-2">{ver.feedback}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      </figure>
    </section>
  )
}

const questions = [
  { q: 'Are stations conducting checks?', a: 'yes' },
  { q: 'What items are broken or missing?', a: 'partly' },
  { q: 'What is the force-wide inventory count?', a: 'no' },
  { q: 'Do we need to procure more?', a: 'no' },
] as const

const answer = {
  yes: { label: 'Armoury can answer', color: '#1f8a5b', icon: '✓' },
  partly: { label: 'Partly', color: '#b5651d', icon: '◐' },
  no: { label: 'Not alone', color: 'var(--accent)', icon: '✕' },
}

export function LogsQuestions() {
  return (
    <figure className="mx-auto my-12 max-w-[680px] px-5">
      <figcaption className="mb-3 text-[16px] font-semibold">What Logs asked, and what Armoury could answer</figcaption>
      <ul className="m-0 list-none divide-y divide-rule border-y border-rule p-0">
        {questions.map((x, k) => {
          const a = answer[x.a]
          return (
            <motion.li
              key={x.q}
              className="flex items-center justify-between gap-4 py-3.5"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ delay: k * 0.12 }}
            >
              <span className="text-[16px] text-ink">{x.q}</span>
              <span className="flex shrink-0 items-center gap-2 text-[16px] font-semibold" style={{ color: a.color }}>
                <span aria-hidden className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: a.color }}>
                  {a.icon}
                </span>
                {a.label}
              </span>
            </motion.li>
          )
        })}
      </ul>
    </figure>
  )
}

/** Armoury (demand signal) and ILMS (supply signal) meeting at TFTD. */
export function SupplyDemand() {
  const [focus, setFocus] = useState<'demand' | 'supply' | null>(null)
  const box = (side: 'demand' | 'supply') =>
    `rounded-2xl border p-5 transition-all duration-300 ${focus && focus !== side ? 'opacity-40' : 'opacity-100'}`
  return (
    <figure className="mx-auto my-14 max-w-[960px] px-5" onPointerLeave={() => setFocus(null)}>
      <figcaption className="mb-4 text-[16px] font-semibold">Integration over building</figcaption>
      <div className="grid items-center gap-4 md:grid-cols-[1fr_auto_1fr]">
        <div className={box('demand')} style={{ borderColor: 'var(--accent)' }} onPointerEnter={(e) => e.pointerType === 'mouse' && setFocus('demand')}>
          <div className="kicker">Demand signal</div>
          <div className="mt-1 font-serif text-[32px] leading-none">Armoury</div>
          <p className="m-0 mt-3 text-[16px] text-ink-2">Usage, issues, readiness and missing equipment, straight from daily checks.</p>
        </div>
        <div className="flex flex-col items-center gap-2 py-0 text-center md:py-2">
          {/* Phones: a short vertical line above and below the pill, so the flow reads Armoury, TFTD, ILMS top to bottom. */}
          <svg width="4" height="40" viewBox="0 0 4 40" aria-hidden className="md:hidden">
            <motion.path
              d="M2 0 V40"
              stroke="var(--color-ink-2)"
              strokeWidth="2"
              strokeDasharray="6 6"
              animate={{ strokeDashoffset: [0, 12] }}
              transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
            />
          </svg>
          {/* Wider screens: the horizontal line between the two cards. */}
          <svg width="120" height="24" viewBox="0 0 120 24" aria-hidden className="hidden md:block">
            <motion.path
              d="M4 12 H116"
              stroke="var(--color-ink-2)"
              strokeWidth="2"
              strokeDasharray="6 6"
              animate={{ strokeDashoffset: [0, -24] }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
            />
          </svg>
          <div className="rounded-full bg-ink px-3 py-1 text-[14px] font-semibold text-white">TFTD · SCDF data branch</div>
          <svg width="4" height="40" viewBox="0 0 4 40" aria-hidden className="md:hidden">
            <motion.path
              d="M2 0 V40"
              stroke="var(--color-ink-2)"
              strokeWidth="2"
              strokeDasharray="6 6"
              animate={{ strokeDashoffset: [0, 12] }}
              transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
            />
          </svg>
        </div>
        <div className={box('supply')} style={{ borderColor: 'var(--color-ink-2)' }} onPointerEnter={(e) => e.pointerType === 'mouse' && setFocus('supply')}>
          <div className="kicker !text-ink-2">Supply signal</div>
          <div className="mt-1 font-serif text-[32px] leading-none">ILMS</div>
          <p className="m-0 mt-3 text-[16px] text-ink-2">Inventory, stock, procurement and replacement: the system that owns supply.</p>
        </div>
      </div>
    </figure>
  )
}
