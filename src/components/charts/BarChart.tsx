import { useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'

export interface Bar {
  label: string
  value: number
  /** Optional note shown in the tooltip. */
  note?: string
  /** Render in the accent colour; others are neutral. */
  emphasis?: boolean
}

interface BarChartProps {
  data: Bar[]
  max: number
  format: (v: number) => string
  ariaLabel: string
  orientation?: 'vertical' | 'horizontal'
}

/** Thin bars from a zero baseline, direct-labelled, with a hover tooltip. */
export function BarChart({ data, max, format, ariaLabel, orientation = 'vertical' }: BarChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' })
  const [hover, setHover] = useState<number | null>(null)

  if (orientation === 'horizontal') {
    return (
      <div ref={ref} role="img" aria-label={ariaLabel} className="flex flex-col gap-4">
        {data.map((d, i) => (
          <div key={d.label} className="grid grid-cols-[minmax(90px,150px)_1fr] items-center gap-4">
            <div className="text-[14px] leading-tight text-ink-2">{d.label}</div>
            <div className="relative h-9" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <motion.div
                className="absolute inset-y-1 left-0 rounded-r-[4px]"
                style={{ background: d.emphasis ? 'var(--accent)' : 'var(--color-muted)', opacity: hover === null || hover === i ? 1 : 0.5 }}
                initial={{ width: 0 }}
                animate={{ width: inView ? `${(d.value / max) * 100}%` : 0 }}
                transition={{ duration: 1.1, delay: i * 0.15, ease: [0.23, 1, 0.32, 1] }}
              />
              <motion.span
                className="absolute top-1/2 -translate-y-1/2 pl-2 text-[15px] font-semibold text-ink tabular"
                initial={{ left: '0%', opacity: 0 }}
                animate={inView ? { left: `${(d.value / max) * 100}%`, opacity: 1 } : {}}
                transition={{ duration: 1.1, delay: i * 0.15, ease: [0.23, 1, 0.32, 1] }}
              >
                {format(d.value)}
              </motion.span>
              {hover === i && d.note && (
                <div className="chart-tip" style={{ left: `${Math.min(80, (d.value / max) * 50)}%`, top: 0 }}>
                  {d.note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div ref={ref} role="img" aria-label={ariaLabel} className="relative">
      <div className="flex h-[260px] items-end gap-[6%] border-b border-ink/30 px-[6%]">
        {data.map((d, i) => (
          <div
            key={d.label}
            className="relative flex h-full flex-1 flex-col justify-end"
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <motion.div
              className="text-center text-[15px] font-semibold text-ink tabular"
              initial={{ opacity: 0 }}
              animate={{ opacity: inView ? 1 : 0 }}
              transition={{ delay: 0.6 + i * 0.12 }}
            >
              {format(d.value)}
            </motion.div>
            <motion.div
              className="mx-auto mt-1.5 w-full max-w-[120px] origin-bottom rounded-t-[4px]"
              style={{
                height: `${(d.value / max) * 82}%`,
                background: d.emphasis ? 'var(--accent)' : 'var(--color-muted)',
                opacity: hover === null || hover === i ? 1 : 0.55,
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: inView ? 1 : 0 }}
              transition={{ duration: 1, delay: i * 0.12, ease: [0.23, 1, 0.32, 1] }}
            />
            {hover === i && d.note && (
              <div className="chart-tip" style={{ left: '50%', top: `${100 - (d.value / max) * 82 - 8}%` }}>
                {d.note}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-[6%] px-[6%] pt-2">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center text-[13px] text-muted">
            {d.label}
          </div>
        ))}
      </div>
    </div>
  )
}
