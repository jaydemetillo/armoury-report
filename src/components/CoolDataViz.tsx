import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Counter } from '@/components/Counter'
import { useActiveStep } from '@/hooks/use-active-step'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { FIREHOUSE_BODY, FIREHOUSE_H, FIREHOUSE_OUTER, FIREHOUSE_RING, FIREHOUSE_W } from '@/components/firehouse-path'

const VEHICLES = 350
const STATIONS = 23
/** Station view shows a full 4 x 4 block per firehouse (23 x 16), so 18 extra dots fade in with it. */
const STATION_DOTS = STATIONS * 16
const W = 640
const H = 480

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

const OUTLINE_SCALE = 0.17
const DOT_GAP = 12.5
const STATION_COLS = 6
const STATION_ROW_Y = (row: number) => 56 + row * 123

/** Centre of station `s`'s outline. */
function stationCentre(s: number) {
  const cellW = W / STATION_COLS
  const row = Math.floor(s / STATION_COLS)
  return { x: (s % STATION_COLS) * cellW + cellW / 2 + (row === 3 ? cellW / 2 : 0), y: STATION_ROW_Y(row) }
}

/** 23 firehouses of ~15 vehicles each: a 4 x 4 block centred in each outline's body. */
function stationLayout(): Layout {
  return Array.from({ length: STATION_DOTS }, (_, i) => {
    const station = i % STATIONS
    const slot = Math.floor(i / STATIONS)
    const c = stationCentre(station)
    const bodyY = (FIREHOUSE_BODY.cy - FIREHOUSE_H / 2) * OUTLINE_SCALE
    return {
      x: c.x + ((slot % 4) - 1.5) * DOT_GAP,
      y: c.y + bodyY + (Math.floor(slot / 4) - 1.5) * DOT_GAP,
    }
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

/**
 * Cool data viz: the 350-vehicle dot scrollytelling (vehicles → officers →
 * 23 stations → paper → 100% on Armoury), with its pinned graphic and steps.
 */
export function CoolDataViz() {
  const { active, setRef } = useActiveStep(steps.length)
  const isMobile = useIsMobile()
  const grid = useMemo(() => gridLayout(), [])
  const stations = useMemo(() => stationLayout(), [])

  const inStations = active === 2 || active === 3
  // The 18 extra dots only exist in the station view, parked in their slots the rest of the time.
  const layout = inStations ? stations : [...grid, ...stations.slice(VEHICLES)]
  const opacityFor = (i: number) => (i >= VEHICLES && !inStations ? 0 : active === 3 ? 0.55 : 1)
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
      <div className="mx-auto grid w-full max-w-[1720px] grid-cols-1 lg:grid-cols-[1fr_440px]">
        <div className="sticky top-12 col-start-1 row-start-1 grid h-[calc(100svh-3rem)] grid-rows-[auto_minmax(0,1fr)_auto_auto] content-center gap-y-3 self-start px-5 py-6 lg:col-start-1 lg:col-end-3 lg:grid-cols-[300px_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto_auto] lg:gap-x-8 lg:py-4">
          <div className="min-h-[92px] lg:col-start-1 lg:row-start-1 lg:self-start lg:pt-4">
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
                <div className="mt-1 text-[16px] text-white/55">{step.stat.label}</div>
              </motion.div>
            </AnimatePresence>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-full max-h-full min-h-0 w-full lg:col-start-2 lg:row-start-1" role="img" aria-label={step.stat.label}>
            {active >= 2 && active <= 3 &&
              Array.from({ length: STATIONS }, (_, st) => {
                const c = stationCentre(st)
                const tf = `translate(${c.x - (FIREHOUSE_W * OUTLINE_SCALE) / 2} ${c.y - (FIREHOUSE_H * OUTLINE_SCALE) / 2}) scale(${OUTLINE_SCALE})`
                return (
                  <g key={st} transform={tf}>
                    {/* Grey outline while stations print their own checklists... */}
                    <motion.path
                      d={FIREHOUSE_RING}
                      fillRule="evenodd"
                      fill="rgb(255 255 255 / 0.12)"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: active === 2 ? 1 : 0 }}
                      transition={{ duration: 0.6 }}
                    />
                    {/* ...then the same shape turns into a dotted line on paper. */}
                    <motion.path
                      d={FIREHOUSE_OUTER}
                      fill="none"
                      stroke="rgb(255 255 255 / 0.3)"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeDasharray="0.1 5"
                      vectorEffect="non-scaling-stroke"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: active === 3 ? 1 : 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  </g>
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
                    opacity: opacityFor(i),
                    transition: 'transform 700ms cubic-bezier(0.23, 1, 0.32, 1), fill 400ms ease, opacity 400ms ease',
                  }}
                />
              ) : (
                <motion.circle
                  key={i}
                  r={4.2}
                  initial={false}
                  animate={{ cx: p.x, cy: p.y, fill: fillFor(i), opacity: opacityFor(i) }}
                  transition={{ type: 'spring', stiffness: 90, damping: 18, delay: (i % 25) * 0.008 }}
                />
              ),
            )}
          </svg>
          <div className="min-h-[3.25rem] lg:col-start-1 lg:col-end-3 lg:row-start-2">
            <AnimatePresence mode="wait">
              <motion.p
                key={active}
                className="m-0 text-[16px] leading-[1.55] text-[#e9e5dc]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: 'easeInOut' }}
              >
                {step.text}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className="credit !text-[12px] !text-white/45 lg:col-start-1 lg:col-end-3 lg:row-start-3">
            Illustrative. One dot ≈ one vehicle or vessel. Source: Armoury problem framing and hackathon pitch, 2023;
            Q3 2026 product review.
          </p>
        </div>

        <div className="relative z-10 col-start-1 row-start-1 px-5 lg:col-start-2">
          <div className="h-[30vh]" />
          {steps.map((_, i) => (
            // Invisible scroll markers: they only drive the active step; the text fades in the frame.
            <div key={i} ref={setRef(i)} className="scrolly-step" aria-hidden />
          ))}
          <div className="h-[40vh]" />
        </div>
      </div>
    </section>
  )
}
