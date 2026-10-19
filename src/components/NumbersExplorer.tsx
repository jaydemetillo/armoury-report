import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BarChart } from '@/components/charts/BarChart'
import { LineChart } from '@/components/charts/LineChart'

const quarters = ["Q4 '25", "Q1 '26", "Q2 '26"]
const int = (v: number) => Math.round(v).toLocaleString('en-SG')

type Metric = {
  id: string
  name: string
  headline: string
  takeaway: string
  chart: () => ReactNode
}

const metrics: Metric[] = [
  {
    id: 'submissions',
    name: 'Total submissions',
    headline: '113,919',
    takeaway: 'Usage stayed healthy and stable: more than 110,000 checks every quarter.',
    chart: () => (
      <BarChart
        ariaLabel="Total submissions per quarter: 108,525, 110,658, 113,919"
        max={120000}
        format={int}
        data={[108525, 110658, 113919].map((value, i) => ({ label: quarters[i], value, emphasis: i === 2 }))}
      />
    ),
  },
  {
    id: 'rate',
    name: 'Submission rate',
    headline: '96.5%',
    takeaway: 'Compliance improved even as more checklists were onboarded.',
    chart: () => (
      <LineChart
        ariaLabel="Submission rate: 92%, 95%, 96.5%"
        domain={[88, 100]}
        ticks={[88, 92, 96, 100]}
        format={(v) => `${Number.isInteger(v) ? v : v.toFixed(1)}%`}
        highlight={[0, 2]}
        data={[92, 95, 96.5].map((value, i) => ({ label: quarters[i], value }))}
      />
    ),
  },
  {
    id: 'checklists',
    name: 'Checklists onboarded',
    headline: '2,225',
    takeaway: 'Growth continued, driven by PPE checks rolling out across all 23 stations.',
    chart: () => (
      <BarChart
        ariaLabel="Checklists onboarded: 1,909, 1,978, 2,225"
        max={2500}
        format={int}
        data={[1909, 1978, 2225].map((value, i) => ({
          label: quarters[i],
          value,
          emphasis: i === 2,
          note: i === 2 ? 'PPE onboarding across all 23 stations' : undefined,
        }))}
      />
    ),
  },
  {
    id: 'time',
    name: 'Median check time',
    headline: '38.5 min',
    takeaway: 'UI V2 cut check time against the earlier digital baseline, despite a richer interface.',
    chart: () => (
      <BarChart
        orientation="horizontal"
        ariaLabel="Median check time: Q4 2025 41 minutes, Q1 2026 41 minutes, Q2 2026 38.5 minutes"
        max={45}
        format={(v) => `${v} min`}
        data={[41, 41, 38.5].map((value, i) => ({ label: quarters[i], value, emphasis: i === 2 }))}
      />
    ),
  },
  {
    id: 'csat',
    name: 'Frontline CSAT',
    headline: '4.29 / 5',
    takeaway: 'Satisfaction recovered from a Q1 dip after targeted improvements.',
    chart: () => (
      <LineChart
        ariaLabel="Frontline CSAT: 4.3, 3.68, 4.29 out of 5"
        domain={[3, 5]}
        ticks={[3, 3.5, 4, 4.5, 5]}
        format={(v) => v.toFixed(2).replace(/0$/, '')}
        highlight={[0, 1, 2]}
        refLines={[{ value: 4, label: 'Target' }]}
        data={[4.3, 3.68, 4.29].map((value, i) => ({ label: quarters[i], value }))}
      />
    ),
  },
  {
    id: 'admin',
    name: 'Admin insight usefulness',
    headline: '5 / 5',
    takeaway: 'Dashboards and data workflows became genuinely valuable to admin users.',
    chart: () => (
      <LineChart
        ariaLabel="Admin insight usefulness: 3.5, 4.86, 5 out of 5"
        domain={[3, 5]}
        ticks={[3, 3.5, 4, 4.5, 5]}
        format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0$/, ''))}
        highlight={[0, 1, 2]}
        data={[3.5, 4.86, 5].map((value, i) => ({ label: quarters[i], value }))}
      />
    ),
  },
]

export function NumbersExplorer() {
  const [selected, setSelected] = useState(0)
  const metric = metrics[selected]

  return (
    <div className="mx-auto my-12 max-w-[1100px] px-5">
      <div className="grid gap-8 rounded-[20px] border border-rule bg-white/60 p-5 sm:p-8 lg:grid-cols-[300px_1fr]">
        <div role="tablist" aria-label="Metrics" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          <div className="mb-3 hidden rounded-xl bg-paper-2/70 px-4 py-3 lg:block">
            <div className="text-[13px] text-muted">Checklist coverage, every quarter</div>
            <div className="font-serif text-[40px] leading-none">100%</div>
          </div>
          {metrics.map((m, i) => (
            <button
              key={m.id}
              role="tab"
              aria-selected={selected === i}
              onClick={() => setSelected(i)}
              className="relative shrink-0 cursor-pointer rounded-xl px-4 py-3 text-left transition-colors hover:bg-paper-2/60"
            >
              {selected === i && (
                <motion.span
                  layoutId="metric-pill"
                  className="absolute inset-0 rounded-xl bg-ink"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span className={`relative block text-[13px] ${selected === i ? 'text-white/60' : 'text-muted'}`}>{m.name}</span>
              <span className={`relative block font-serif text-[26px] leading-tight ${selected === i ? 'text-white' : 'text-ink'}`}>
                {m.headline}
              </span>
            </button>
          ))}
        </div>
        <div role="tabpanel" className="min-h-[380px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <h3 className="m-0 text-[17px] font-semibold">{metric.name}, by quarter</h3>
              <p className="mt-1 mb-6 max-w-[48ch] text-[15px] text-muted">{metric.takeaway}</p>
              {metric.chart()}
            </motion.div>
          </AnimatePresence>
          <p className="credit mt-4">Source: Armoury quarterly product reviews, Q4 2025 – Q3 2026.</p>
        </div>
      </div>
    </div>
  )
}
