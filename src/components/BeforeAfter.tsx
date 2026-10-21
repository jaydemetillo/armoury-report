import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const rows = [
  {
    area: 'Checklist completion',
    before: 'Mostly on paper, with templates that varied station to station.',
    after: 'Every vehicle, equipment and PPE check across all 23 fire stations.',
  },
  {
    area: 'Time burden',
    before: 'Paper checks took 60+ minutes.',
    after: 'Median check time of 38.5 minutes after UI V2.',
  },
  {
    area: 'Audit trail',
    before: 'Records existed, but were hard to search, compare or use.',
    after: 'Every submission logged; reports keep the question wording used at the time.',
  },
  {
    area: 'HQ visibility',
    before: 'No consolidated, live view of island-wide readiness.',
    after: 'Divisional Heads and HQ track readiness and missing submissions on dashboards.',
  },
  {
    area: 'Issue visibility',
    before: 'Faults and missing items stayed invisible until reports or manual escalation.',
    after: 'Flagged items surface the moment a check is submitted, so commanders act earlier.',
  },
  {
    area: 'PPE checks',
    before: 'Not tracked. Commanders had no live view of compliance.',
    after: 'All 23 fire stations run daily PPE checks on Armoury.',
  },
]

export function BeforeAfter() {
  const [after, setAfter] = useState(true)

  return (
    <section aria-label="Before and after Armoury" className="mx-auto my-16 max-w-[1000px] px-5">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <h3 className="m-0 font-serif text-[34px] leading-tight font-normal">What changed for SCDF</h3>
        <div role="radiogroup" aria-label="Show" className="relative flex rounded-full bg-paper-2 p-1 text-[16px] font-medium">
          {(['Before', 'After'] as const).map((label) => {
            const on = (label === 'After') === after
            return (
              <button
                key={label}
                role="radio"
                aria-checked={on}
                onClick={() => setAfter(label === 'After')}
                className="relative cursor-pointer rounded-full px-5 py-1.5"
              >
                {on && (
                  <motion.span
                    layoutId="ba-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: label === 'After' ? 'var(--accent)' : 'var(--color-ink)' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className={`relative ${on ? 'text-white' : 'text-ink-2'}`}>{label} Armoury</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="divide-y divide-rule border-y border-rule">
        {rows.map((r, i) => (
          <div key={r.area} className="grid grid-cols-1 gap-1 py-4 sm:grid-cols-[200px_1fr] sm:gap-6">
            <div className="text-[16px] font-semibold text-muted">{r.area}</div>
            <div className="relative min-h-[1.6em]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.p
                  key={after ? 'a' : 'b'}
                  className={`m-0 text-[16px] leading-snug ${after ? 'text-ink' : 'text-muted'}`}
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                >
                  {after ? r.after : r.before}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
