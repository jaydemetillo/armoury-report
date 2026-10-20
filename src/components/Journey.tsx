import { useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'

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

/** Scroll distance spent on each chapter while the timeline is pinned. */
const STEP_SVH = 60

export function Journey() {
  const [active, setActive] = useState(0)
  const chapter = chapters[active]
  const sectionRef = useRef<HTMLElement>(null)

  // Scrolling through the section steps the timeline 1 → 7. The panel is
  // pinned below the 48px masthead, so progress starts there.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start 48px', 'end end'] })
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    setActive(Math.min(chapters.length - 1, Math.max(0, Math.floor(p * chapters.length))))
  })

  // Clicking a step scrolls to the middle of that chapter's stretch.
  const scrollToChapter = (i: number) => {
    const el = sectionRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 48
    const distance = el.offsetHeight - window.innerHeight + 48
    window.scrollTo({ top: top + distance * ((i + 0.5) / chapters.length), behavior: 'smooth' })
  }

  return (
    <section
      ref={sectionRef}
      aria-label="The journey at a glance"
      className="relative my-20"
      style={{ height: `calc(${chapters.length * STEP_SVH}svh + 100svh)` }}
    >
      <div className="sticky top-12 mx-auto flex h-[calc(100svh-3rem)] max-w-[1100px] flex-col justify-center px-5">
        <p className="kicker mb-2">The journey at a glance</p>
        <h2 className="section-title m-0 mb-10 max-w-[18ch]">Seven chapters, from binder to backbone.</h2>

        <div className="relative">
          <div className="absolute top-[15px] right-0 left-0 h-px bg-rule" />
          <motion.div
            className="absolute top-[14px] left-0 h-[3px] rounded-full bg-[var(--accent)]"
            animate={{ width: `${(active / (chapters.length - 1)) * 100}%` }}
            transition={{ type: 'spring', stiffness: 180, damping: 26 }}
          />
          <ol className="relative m-0 grid list-none grid-cols-7 p-0">
            {chapters.map((c, i) => (
              <li key={c.title} className="flex justify-center first:justify-start last:justify-end">
                <button
                  type="button"
                  onClick={() => scrollToChapter(i)}
                  aria-pressed={active === i}
                  aria-label={`Chapter ${i + 1}: ${c.title}`}
                  className="group flex cursor-pointer flex-col items-center gap-3 bg-transparent p-0"
                >
                  <span
                    className="grid h-[30px] w-[30px] place-items-center rounded-full border text-[12px] font-semibold transition-colors tabular"
                    style={{
                      background: i <= active ? 'var(--accent)' : 'var(--color-paper)',
                      borderColor: i <= active ? 'var(--accent)' : 'var(--color-rule)',
                      color: i <= active ? 'white' : 'var(--color-muted)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden max-w-[110px] text-center text-[12px] leading-tight text-muted group-hover:text-ink md:block">
                    {c.period}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="grid gap-8 md:grid-cols-[1.1fr_1fr_1fr]"
            >
              <div>
                <div className="text-[13px] text-muted tabular">
                  {String(active + 1).padStart(2, '0')} · {chapter.period}
                </div>
                <h3 className="m-0 mt-1 font-serif text-[40px] leading-[1.02] font-normal">{chapter.title}</h3>
              </div>
              <div className="border-t border-rule pt-3">
                <div className="mb-1 text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">What happened</div>
                <p className="m-0 text-[16px] leading-relaxed text-ink-2">{chapter.happened}</p>
              </div>
              <div className="border-t-2 pt-3" style={{ borderColor: 'var(--accent)' }}>
                <div className="mb-1 text-[12px] font-semibold tracking-[0.12em] text-muted uppercase">What changed</div>
                <p className="m-0 text-[16px] leading-relaxed text-ink">{chapter.changed}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
