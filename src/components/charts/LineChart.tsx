import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'motion/react'

export interface Point {
  label: string
  value: number
}

interface RefLine {
  value: number
  label: string
}

interface LineChartProps {
  data: Point[]
  domain: [number, number]
  ticks: number[]
  format: (v: number) => string
  refLines?: RefLine[]
  height?: number
  /** Index of the point to call out with a direct label. Defaults to the last. */
  highlight?: number[]
  ariaLabel: string
}

const M = { top: 32, right: 96, bottom: 40, left: 56 }
const DEFAULT_W = 680

export function LineChart({ data, domain, ticks, format, refLines = [], height = 300, highlight, ariaLabel }: LineChartProps) {
  const ref = useRef<SVGSVGElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' })
  const [hover, setHover] = useState<number | null>(null)
  // Draw at the container's real pixel width so SVG text stays 16px instead of scaling down with the viewBox.
  const [W, setW] = useState(DEFAULT_W)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setW(Math.max(280, Math.round(el.getBoundingClientRect().width)))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const iw = W - M.left - M.right
  const ih = height - M.top - M.bottom
  const x = (i: number) => M.left + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const y = (v: number) => M.top + ih - ((v - domain[0]) / (domain[1] - domain[0])) * ih
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i)},${y(d.value)}`).join(' ')
  const labelled = new Set(highlight ?? [data.length - 1])

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${height}`}
        className="block h-auto w-full overflow-visible"
        role="img"
        aria-label={ariaLabel}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} stroke="var(--color-rule)" strokeWidth={1} />
            <text x={M.left - 10} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[16px] tabular">
              {format(t)}
            </text>
          </g>
        ))}
        {refLines.map((r) => (
          <g key={r.label}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(r.value)}
              y2={y(r.value)}
              stroke="var(--color-ink-2)"
              strokeDasharray="4 5"
              strokeWidth={1.25}
            />
            <text x={W - M.right + 8} y={y(r.value)} dy="0.32em" className="fill-ink-2 text-[16px]">
              {r.label}
            </text>
          </g>
        ))}
        {data.map((d, i) => (
          <text key={d.label} x={x(i)} y={height - 10} textAnchor="middle" className="fill-muted text-[16px]">
            {d.label}
          </text>
        ))}
        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={M.top} y2={M.top + ih} stroke="var(--color-ink)" strokeOpacity={0.25} />
        )}
        <motion.path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: inView ? 1 : 0 }}
          transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
        />
        {data.map((d, i) => (
          <g key={d.label}>
            <motion.circle
              cx={x(i)}
              cy={y(d.value)}
              r={hover === i ? 7 : 5.5}
              fill="var(--accent)"
              stroke="var(--color-paper)"
              strokeWidth={2}
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: 0.25 + (i / Math.max(1, data.length - 1)) * 1.1, type: 'spring', stiffness: 400, damping: 22 }}
            />
            {labelled.has(i) && (
              <motion.text
                x={i === data.length - 1 ? x(i) - 6 : x(i)}
                y={i === data.length - 1 ? y(d.value) - 16 : y(d.value) - 14}
                textAnchor={i === data.length - 1 ? 'end' : 'middle'}
                className="fill-ink text-[16px] font-semibold tabular [paint-order:stroke] stroke-paper stroke-[5px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: inView ? 1 : 0 }}
                transition={{ delay: 1.3 }}
              >
                {format(d.value)}
              </motion.text>
            )}
            <rect
              x={x(i) - iw / data.length / 2}
              y={M.top}
              width={iw / data.length}
              height={ih}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(data[hover].value) / height) * 100}%` }}>
          <div className="text-white/60">{data[hover].label}</div>
          <div className="font-semibold tabular">{format(data[hover].value)}</div>
        </div>
      )}
    </div>
  )
}
