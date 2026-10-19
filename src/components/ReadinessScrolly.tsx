import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Counter } from '@/components/Counter'
import { useActiveStep } from '@/hooks/use-active-step'
import { useIsMobile } from '@/hooks/use-is-mobile'

const VEHICLES = 350
const STATIONS = 23
const W = 640
const H = 520

type Layout = { x: number; y: number }[]

function gridLayout(): Layout {
  const cols = 25
  const gap = W / (cols + 1)
  const rows = Math.ceil(VEHICLES / cols)
  const top = (H - (rows - 1) * gap) / 2
  return Array.from({ length: VEHICLES }, (_, i) => ({
    x: gap + (i % cols) * gap,
    y: top + Math.floor(i / cols) * gap,
  }))
}

/** 23 station clusters of ~15 vehicles each. */
function stationLayout(): Layout {
  const cols = 6
  const cellW = W / cols
  const cellH = H / 4
  return Array.from({ length: VEHICLES }, (_, i) => {
    const station = i % STATIONS
    const slot = Math.floor(i / STATIONS)
    const cx = (station % cols) * cellW + cellW / 2 + (Math.floor(station / cols) === 3 ? cellW / 2 : 0)
    const cy = Math.floor(station / cols) * cellH + cellH / 2
    return { x: cx + ((slot % 4) - 1.5) * 13, y: cy + (Math.floor(slot / 4) - 1.5) * 13 }
  })
}

// Stations printed their own versions of the checklist: a deterministic spread of shades.
const versionShades = ['#c8102e', '#e8462f', '#b5651d', '#8c6d4f', '#a33b5c', '#d08a2e']

const steps = [
  {
    stat: { value: 350, label: 'emergency vehicles and vessels' },
    text: (
      <>
        Each dot is one of the <strong>~350 emergency vehicles and vessels</strong> SCDF has to account for. Fire
        engines, ambulances, rescue appliances: every one is checked before it can respond.
      </>
    ),
  },
  {
    stat: { value: 600, label: 'on-duty officers, every day' },
    text: (
      <>
        At least <strong>600 frontline officers</strong> do those checks daily: hoses, water, tools, PPE. The checks
        are there because emergency services need to know their equipment works when the call comes, not because of
        bureaucracy.
      </>
    ),
  },
  {
    stat: { value: 23, label: 'fire stations, 23 versions of the truth' },
    text: (
      <>
        Spread across <strong>23 fire stations</strong>, each station could download, modify and print its own
        checklist template. The same truck could be checked differently depending on where it was parked.
      </>
    ),
  },
  {
    stat: { value: 145600, label: 'checks a year, filed on paper' },
    text: (
      <>
        The hackathon team estimated <strong>more than 2,800 checks a week</strong>, over 145,600 a year. A binder
        could prove a check happened. It could not tell HQ which station was late or which equipment kept failing.
      </>
    ),
  },
  {
    stat: { value: 100, label: '% checklist coverage on Armoury', suffix: '%' },
    text: (
      <>
        By mid-2026, <strong>every SCDF vehicle, equipment and PPE check</strong> across all 23 stations ran on
        Armoury. Each submission is logged and each flagged fault shows up the moment the check is submitted.
      </>
    ),
  },
]

export function ReadinessScrolly() {
  const { active, setRef } = useActiveStep(steps.length)
  const isMobile = useIsMobile()
  const grid = useMemo(() => gridLayout(), [])
  const stations = useMemo(() => stationLayout(), [])

  const layout = active === 2 || active === 3 ? stations : grid
  const fillFor = (i: number) => {
    switch (active) {
      case 0:
        return '#e9e5dc'
      case 1:
        return i % 7 === 0 ? 'var(--accent)' : '#e9e5dc'
      case 2:
        return versionShades[(i % STATIONS) % versionShades.length]
      case 3:
        return '#4a515c'
      default:
        return '#36c486'
    }
  }

  const step = steps[active]

  return (
    <section id="paper" className="dark-band relative bg-night text-[#e9e5dc]">
      <div className="mx-auto grid max-w-[1240px] grid-cols-1 lg:grid-cols-[1fr_440px]">
        <div className="sticky top-12 col-start-1 row-start-1 flex h-[calc(100svh-3rem)] flex-col justify-center self-start px-5 py-8">
          <div className="mb-4 min-h-[92px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35 }}
              >
                <div className="font-serif text-[clamp(3rem,7vw,5.5rem)] leading-none tabular">
                  <Counter value={step.stat.value} suffix={step.stat.suffix} duration={1.1} />
                </div>
                <div className="mt-1 text-[13px] tracking-[0.12em] text-white/55 uppercase">{step.stat.label}</div>
              </motion.div>
            </AnimatePresence>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto max-h-[62svh] w-full" role="img" aria-label={step.stat.label}>
            {active >= 2 && active <= 3 &&
              Array.from({ length: STATIONS }, (_, s) => {
                const p = stations[s]
                return (
                  <motion.rect
                    key={s}
                    x={p.x - 13 * 2.3}
                    y={p.y - 13 * 2.3 + 13 * 1.5}
                    width={13 * 4.6}
                    height={13 * 4.6}
                    rx={8}
                    fill="none"
                    stroke="rgb(255 255 255 / 0.12)"
                    strokeDasharray={active === 3 ? '3 4' : undefined}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                )
              })}
            {layout.map((p, i) =>
              isMobile ? (
                // Phones: 350 compositor-friendly CSS transitions instead of
                // 350 JS-driven springs.
                <circle
                  key={i}
                  r={4.2}
                  style={{
                    transform: `translate(${p.x}px, ${p.y}px)`,
                    fill: fillFor(i),
                    opacity: active === 3 ? 0.55 : 1,
                    transition: 'transform 700ms cubic-bezier(0.23, 1, 0.32, 1), fill 400ms ease, opacity 400ms ease',
                  }}
                />
              ) : (
                <motion.circle
                  key={i}
                  r={4.2}
                  initial={false}
                  animate={{ cx: p.x, cy: p.y, fill: fillFor(i), opacity: active === 3 ? 0.55 : 1 }}
                  transition={{ type: 'spring', stiffness: 90, damping: 18, delay: (i % 25) * 0.008 }}
                />
              ),
            )}
          </svg>
          <p className="credit mt-3 !text-white/45">
            Illustrative. One dot ≈ one vehicle or vessel. Source: Armoury problem framing and hackathon pitch, 2023;
            Q3 2026 product review.
          </p>
        </div>

        <div className="relative z-10 col-start-1 row-start-1 px-5 lg:col-start-2">
          <div className="h-[30vh]" />
          {steps.map((s, i) => (
            <div key={i} ref={setRef(i)} className="scrolly-step">
              <p className="scrolly-card m-0" style={{ opacity: active === i ? 1 : 0.35 }}>
                {s.text}
              </p>
            </div>
          ))}
          <div className="h-[40vh]" />
        </div>
      </div>
    </section>
  )
}
