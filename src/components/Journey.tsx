import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useMotionValueEvent, useScroll } from 'motion/react'
import { RevealLine } from '@/components/RevealLine'

const chapters = [
  {
    period: 'Before 2023',
    title: 'The paper problem',
    happened: 'Vehicle and equipment readiness checks were largely paper-based.',
    changed: 'HQ had limited visibility. The data was hard to use, and station practices drifted apart.',
  },
  {
    period: '2023',
    title: 'Hackathon origin',
    happened: 'Armoury was built at Hack for Public Good as a working proof of concept.',
    changed: 'Checks could be digitised, and made useful beyond record-keeping.',
  },
  {
    period: 'Jul – Oct 2023',
    title: 'From POC to production',
    happened: 'The team validated with frontliners and iterated from rough prototypes into a usable platform.',
    changed: 'Armoury moved from “digital form” to an operational workflow tool.',
  },
  {
    period: '2024 – 2025',
    title: 'Adoption and scale',
    happened: 'One checklist and one workflow grew into broad SCDF coverage.',
    changed: 'The North Star was adoption: the number of checks submitted.',
  },
  {
    period: 'Late 2025 – Q1 2026',
    title: 'The admin gap',
    happened: 'Frontline use was strong, but HQ and admins needed better insight and decision support.',
    changed: 'The focus shifted from capturing checks to making the data useful.',
  },
  {
    period: 'Q2 – Q3 2026',
    title: 'The last mile',
    happened: 'CSAT, UI V2, PPE onboarding, multi-photo support, dashboards, VAPT and handover.',
    changed: 'Armoury reached feature-complete and entered maintenance on 6 July 2026.',
  },
  {
    period: 'After July 2026',
    title: 'What comes next',
    happened: 'Armoury stays stable while the team explores Pulse, SCDF’s next problem and WOG demand.',
    changed: 'The product keeps serving SCDF. Active feature development has stopped.',
  },
]

const base = import.meta.env.BASE_URL

/** The road itself is hidden for now; the lane (space) and the fire engine driving down it stay. Flip to true to show it. */
const SHOW_ROAD = false

/** Truck artwork box (firetruck-pump.svg, cropped) and its wheels, in artwork units: [x, y, width, height]. */
const TRUCK_W = 243
const TRUCK_H = 674
const WHEELS = [
  [15, 87, 16, 71],
  [212, 87, 16, 71],
  [2, 504, 27, 72],
  [214, 504, 27, 72],
]
const TREAD_PERIOD = 18
/**
 * How far above the heading the truck's track begins: the 128px gap (mt-32) plus 180px reaching up behind the black
 * question section above, so the truck starts hidden there and slides out from under its bottom edge.
 */
const ROAD_LEAD = 128 + 180
/** How much faster than the scroll the truck pulls away once the last chapter is reached. */
const DRIVE_OFF = 2.6

/** One highway for the whole journey and a single fire engine that drives down it with the scroll. */
export function Journey() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const truckImg = useRef<HTMLImageElement>(null)
  const tread = useRef<SVGPatternElement>(null)
  const layout = useRef({ tops: [] as number[], last: 0, unit: 0.32 })
  const [active, setActive] = useState(0)
  // Extra downward travel once the last chapter is reached (zero before that).
  const drive = useMotionValue(0)
  // A faint suspension sway so the truck feels like it is rolling over a road, not sliding.
  const sway = useMotionValue(0)
  const [trackH, setTrackH] = useState(0)
  const { scrollY } = useScroll()

  // The truck itself is pinned with CSS `position: sticky`, so the browser scrolls it on the compositor and it can
  // never lag or jitter. JavaScript only handles the highlight, the wheels, and the final drive off the frame.
  const update = useCallback(() => {
    const wrap = wrapRef.current
    const { tops, last } = layout.current
    if (!wrap || !tops.length) return
    const r = window.innerHeight * 0.5 - wrap.getBoundingClientRect().top
    drive.set(r > last ? (r - last) * DRIVE_OFF : 0)

    let idx = 0
    tops.forEach((t, i) => {
      if (t - 20 <= r) idx = i
    })
    setActive(idx)

    // Wheels: the road runs under the truck at the truck's own speed along it, so the tread follows its position.
    const pos = r <= -ROAD_LEAD ? -ROAD_LEAD : r <= last ? r : last + (r - last) * DRIVE_OFF
    const phase = -(pos / layout.current.unit) % TREAD_PERIOD
    tread.current?.setAttribute('patternTransform', `translate(0 ${phase})`)
    sway.set(Math.sin(pos / 11) * 0.45)
  }, [drive, sway])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const measure = () => {
      const lis = [...wrap.querySelectorAll<HTMLElement>('[data-chapter]')]
      const tops = lis.map((el) => el.offsetTop)
      layout.current = {
        tops,
        last: tops[tops.length - 1] + 100,
        unit: (truckImg.current?.offsetWidth || 58) / TRUCK_W,
      }
      // The truck stays pinned until the last chapter, then lets go and drives away.
      setTrackH(layout.current.last + ROAD_LEAD)
      update()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [update])
  useMotionValueEvent(scrollY, 'change', update)

  // Fully transparent behind the black section, then easing in over 200px below its bottom edge, so the truck fades into
  // view as it slides out. It fades out again over the last 200px.
  const edge = ROAD_LEAD - 128
  const fade = `linear-gradient(to bottom, transparent ${edge}px, #000 ${edge + 200}px, #000 calc(100% - 200px), transparent)`

  return (
    <section aria-label="The journey at a glance" className="relative mx-auto mt-32 max-w-[1000px] px-5">
      <div ref={wrapRef} className="relative pb-[200px]" style={{ clipPath: `inset(-${ROAD_LEAD}px -40px 0 -40px)` }}>
        {/* One endless highway that starts off frame: a seamless tile of road-scdf.svg. The road and the truck share one
            fade, so the truck drives in through the gradient at the start and out through it at the end. */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 overflow-clip"
          style={{ top: -ROAD_LEAD, maskImage: fade, WebkitMaskImage: fade }}
        >
          {SHOW_ROAD && (
          <div
            className="absolute inset-y-0 left-0 w-[72px] lg:w-[168px]"
            style={{ backgroundImage: `url(${base}figma/road-tile.svg)`, backgroundSize: '100% auto', backgroundRepeat: 'repeat-y' }}
          />
          )}
          {/* Product image: the SCDF fire engine (top-down). The only truck on the road. It rides in a track that ends at
              the last chapter: `sticky` holds it half-way down the screen until then. */}
          <div className="absolute top-0 left-0 w-[72px] lg:w-[168px]" style={{ height: trackH }}>
            <div className="sticky top-[50vh] flex h-0 justify-center">
              <motion.div className="relative w-[34px] -translate-y-1/2 lg:w-[58px]" style={{ x: sway, y: drive }}>
                <div aria-hidden className="absolute inset-x-0 top-1 bottom-0 rounded-md shadow-[0_8px_12px_rgb(0_0_0/0.28)]" />
                <img ref={truckImg} src={`${base}figma/firetruck-pump.svg`} alt="" className="relative block h-auto w-full" />
                <svg viewBox={`0 0 ${TRUCK_W} ${TRUCK_H}`} className="absolute inset-0 h-full w-full">
                  <defs>
                    {/* Tyre tread: dark rubber with lighter lugs, scrolled along the wheel as the truck moves. */}
                    <pattern id="journey-tread" ref={tread} width="30" height={TREAD_PERIOD} patternUnits="userSpaceOnUse">
                      <rect width="30" height={TREAD_PERIOD} fill="#0b0b0c" />
                      <rect y="2" width="30" height="7" fill="#5a5d63" />
                    </pattern>
                  </defs>
                  {WHEELS.map(([x, wy, w, h]) => (
                    <rect key={`${x}-${wy}`} x={x} y={wy} width={w} height={h} rx={3} fill="url(#journey-tread)" />
                  ))}
                </svg>
              </motion.div>
            </div>
          </div>
        </div>

        <div className="pl-[96px] sm:pl-[112px] lg:pl-[224px]">
          <div className="pt-2">
            <p className="kicker mb-2">The journey at a glance</p>
            <h2 className="section-title m-0 mb-4 max-w-[18ch]">Seven chapters, from binder to backbone.</h2>
          </div>
          <ol className="m-0 list-none p-0">
            {chapters.map((c, i) => (
              <li
                key={c.title}
                data-chapter
                className="max-w-[620px] py-8 transition-opacity duration-500 lg:py-10"
              >
                <div className="flex items-center gap-3 text-[14px] text-muted tabular">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full border-[1.5px] text-[14px] font-semibold transition-colors duration-500 ${
                      i <= active ? 'border-[var(--accent)] bg-[var(--accent)] text-white' : 'border-muted bg-transparent text-muted'
                    }`}
                  >
                    {i + 1}
                  </span>
                  {c.period}
                </div>
                <div className="transition-opacity duration-500" style={{ opacity: i === active ? 1 : 0.5 }}>
                <h3 className="m-0 mt-3 font-serif text-[36px] leading-[1.15] font-normal sm:text-[40px]">{c.title}</h3>
                <div className="mt-6 border-l-2 border-muted/20 pl-4">
                  <div className="mb-1 text-[14px] font-semibold text-muted">What happened</div>
                  <p className="m-0 text-[16px] leading-relaxed text-ink-2">{c.happened}</p>
                </div>
                <div className="relative mt-5 pl-4">
                  {/* Draws itself downward once the truck has reached this chapter. */}
                  <RevealLine show={i <= active} />
                  <div className="mb-1 text-[14px] font-semibold text-muted">What changed</div>
                  <p className="m-0 text-[16px] leading-relaxed text-ink">{c.changed}</p>
                </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
