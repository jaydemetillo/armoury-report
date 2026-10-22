import { motion } from 'motion/react'
import { BarChart } from '@/components/charts/BarChart'
import { ChartFrame } from '@/components/charts/ChartFrame'

const fixes = [
  { stat: '4.29', unit: '/ 5', title: 'UI V2', body: 'Cleaner home, clearer grouping, bigger yes/no targets and an issue prompt on every “no”. Shipped 6 July 2026.' },
  { stat: '1 → 6', unit: 'photos', title: 'Multi-photo', body: 'EMTs no longer stitch several photos into one image before uploading.' },
  { stat: '2,225', unit: 'checklists', title: 'PPE on Armoury', body: 'Daily PPE checks onboarded at all 23 fire stations: one platform for shift readiness.' },
  { stat: '12 → 1', unit: 'taps', title: 'Mark as Not In Use', body: 'An unfilled manning slot now takes one tap, not twelve per person.' },
  { stat: '50+ → few', unit: 'at 8am', title: 'Categories', body: 'Checklists filtered by service type, so the home screen shows only what your role needs.' },
  { stat: '0', unit: 'critical', title: 'VAPT with Cure53', body: 'The one high finding was fixed, and most medium and low ones too. A few were risk-accepted by design.' },
]

export function FixGrid() {
  return (
    // Outer padding keeps at least 32px between the grid and the viewport edge at every width.
    <div className="my-14 px-8">
    <div className="mx-auto grid max-w-[1100px] gap-px overflow-hidden rounded-[20px] border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
      {fixes.map((f, i) => (
        <motion.div
          key={f.title}
          className="bg-paper p-6"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10% 0px' }}
          transition={{ delay: (i % 3) * 0.08, duration: 0.5 }}
        >
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[44px] leading-none text-[var(--accent)]">{f.stat}</span>
            <span className="text-[14px] text-muted">{f.unit}</span>
          </div>
          <div className="mt-3 text-[16px] font-semibold">{f.title}</div>
          <p className="m-0 mt-1 text-[16px] leading-snug text-ink-2">{f.body}</p>
        </motion.div>
      ))}
    </div>
    </div>
  )
}

export function CheckTimeChart() {
  return (
    <ChartFrame
      title="Faster checks, despite a richer interface"
      subtitle="Median time to complete a check, in minutes"
      source="Armoury product review baseline; Q3 2026 product review."
    >
      <BarChart
        orientation="horizontal"
        ariaLabel="Median check time: paper 60 plus minutes, earlier digital 41 minutes, UI V2 38.5 minutes"
        max={64}
        format={(v) => (v === 60 ? '60+' : String(v))}
        data={[
          { label: 'Paper', value: 60, note: 'Product review baseline' },
          { label: 'Armoury, before UI V2', value: 41, note: 'Q4 2025 – Q1 2026' },
          { label: 'Armoury, UI V2', value: 38.5, emphasis: true, note: '6.1% faster than before' },
        ]}
      />
    </ChartFrame>
  )
}

/** EMT satisfaction before and after multi-photo support. */
export function EmtSlope() {
  const y = (v: number) => 200 - v * 1.8
  return (
    <ChartFrame
      title="EMT satisfaction recovered after multi-photo support"
      subtitle="Share of EMT respondents satisfied"
      source="Armoury Q3 2026 product review."
      className="mx-auto my-14 max-w-[520px] px-5"
    >
      <svg viewBox="0 0 330 220" className="h-auto w-full overflow-visible" role="img" aria-label="EMT satisfaction rose from 26.7% to 82.5%">
        <line x1="65" x2="65" y1="20" y2="200" stroke="var(--color-rule)" />
        <line x1="265" x2="265" y1="20" y2="200" stroke="var(--color-rule)" />
        <text x="65" y="218" textAnchor="middle" className="fill-muted text-[16px]">Before</text>
        <text x="265" y="218" textAnchor="middle" className="fill-muted text-[16px]">After multi-photo</text>
        <motion.line
          x1="65"
          y1={y(26.7)}
          x2="265"
          y2={y(82.5)}
          stroke="var(--accent)"
          strokeWidth="2.5"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
        />
        <circle cx="65" cy={y(26.7)} r="6" fill="var(--color-muted)" stroke="var(--color-paper)" strokeWidth="2" />
        <circle cx="265" cy={y(82.5)} r="6" fill="var(--accent)" stroke="var(--color-paper)" strokeWidth="2" />
        <text x="51" y={y(26.7)} dy="0.32em" textAnchor="end" className="fill-ink text-[16px] font-semibold">26.7%</text>
        <text x="279" y={y(82.5)} dy="0.32em" className="fill-ink text-[16px] font-semibold">82.5%</text>
      </svg>
    </ChartFrame>
  )
}
