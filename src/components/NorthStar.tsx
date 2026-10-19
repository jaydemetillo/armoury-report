import { AnimatePresence, motion } from 'motion/react'
import { Counter } from '@/components/Counter'
import { LineChart } from '@/components/charts/LineChart'
import { useActiveStep } from '@/hooks/use-active-step'

const steps = [
  {
    label: 'Originally',
    text: (
      <>
        <strong>Number of checks submitted</strong> was the right metric when the only question that mattered was:
        will frontliners actually use this every day? If checks aren’t submitted, there is no data, no trust and no
        operational value.
      </>
    ),
  },
  {
    label: 'The turn',
    text: (
      <>
        By 2026 coverage was 100% and volume was healthy. Pushing for more submissions would have meant optimising
        for the wrong thing. <em>“Submission count tells us checklists are being submitted. It doesn’t tell us whether
        the product earns that behaviour or just mandates it.”</em>
      </>
    ),
  },
  {
    label: 'Then',
    text: (
      <>
        <strong>Frontliner CSAT</strong> became the honest signal. Q1 2026 had dipped to 3.68. The team set a 4.0
        target and a 4.5 stretch, and after UI V2 landed at <strong>4.29 across 937 SCDF respondents</strong>: 84.7%
        satisfied, above the 70% industry benchmark.
      </>
    ),
  },
]

export function NorthStar() {
  const { active, setRef } = useActiveStep(steps.length)
  const isCsat = active === 2

  return (
    <section className="relative bg-paper-2/70">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 lg:grid-cols-[1fr_420px]">
        <div className="sticky top-12 col-start-1 row-start-1 flex h-[calc(100svh-3rem)] flex-col justify-center self-start px-5">
          <div className="kicker mb-3">The North Star</div>
          <div className="relative min-h-[150px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={isCsat ? 'csat' : 'subs'}
                initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -30, filter: 'blur(8px)' }}
                transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="display text-[clamp(2.5rem,6vw,4.75rem)]">
                  {isCsat ? 'Frontliner satisfaction' : 'Checks submitted'}
                </div>
                <div className="mt-2 font-serif text-[clamp(2rem,4vw,3rem)] text-[var(--accent)] tabular">
                  {isCsat ? <Counter value={4.29} decimals={2} suffix=" / 5" /> : <Counter value={113919} />}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-6 min-h-[260px] max-w-[640px]">
            {isCsat ? (
              <LineChart
                ariaLabel="Frontline CSAT: Q4 2025 4.3, Q1 2026 3.68, Q2 2026 4.29, against a 4.0 target and 4.5 stretch"
                domain={[3, 5]}
                ticks={[3, 3.5, 4, 4.5, 5]}
                format={(v) => v.toFixed(2).replace(/0$/, '')}
                highlight={[1, 2]}
                height={260}
                refLines={[
                  { value: 4, label: 'Target' },
                  { value: 4.5, label: 'Stretch' },
                ]}
                data={[
                  { label: "Q4 '25", value: 4.3 },
                  { label: "Q1 '26", value: 3.68 },
                  { label: "Q2 '26", value: 4.29 },
                ]}
              />
            ) : (
              <div className="flex items-center gap-3 text-[15px] text-muted">
                <motion.span
                  className="h-2 rounded-full bg-[var(--accent)]"
                  initial={{ width: 0 }}
                  animate={{ width: active === 0 ? 240 : 320 }}
                  transition={{ duration: 1 }}
                />
                {active === 0 ? 'adoption, quarter after quarter' : '100% coverage reached'}
              </div>
            )}
          </div>
          <p className="credit mt-2">Source: Armoury Vision &amp; Metrics; Q1 and Q3 2026 product reviews.</p>
        </div>
        <div className="relative z-10 col-start-1 row-start-1 px-5 lg:col-start-2">
          <div className="h-[35vh]" />
          {steps.map((s, i) => (
            <div key={s.label} ref={setRef(i)} className="scrolly-step">
              <div className="scrolly-card" style={{ opacity: active === i ? 1 : 0.35 }}>
                <div className="kicker mb-2">{s.label}</div>
                <p className="m-0">{s.text}</p>
              </div>
            </div>
          ))}
          <div className="h-[35vh]" />
        </div>
      </div>
    </section>
  )
}
