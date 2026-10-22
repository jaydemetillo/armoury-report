import { SplitReveal } from '@/components/SplitReveal'
import { useState } from 'react'
import { CrossfadeLoopVideo } from '@/components/CrossfadeLoopVideo'
import { AnimatePresence, motion } from 'motion/react'

const worked = [
  ['Start with the ground', 'The team watched checks happen, built prototypes and brought them back to users. Armoury was shaped by people doing physical, repetitive, operationally important work, not designed in a conference room.'],
  ['Prove adoption before sophistication', 'No perfect dashboard, no procurement workflow. First, prove that daily checks could move from paper to digital and that people would submit them.'],
  ['Treat data as visibility, not reporting', 'The real shift was turning checks into a live operational signal, so commanders saw missing submissions and issues sooner.'],
  ['Know when not to build', 'The Logs gap could have turned Armoury into an inventory system. Recognising it as the demand signal, not supply-side truth, protected the scope.'],
  ['Change the North Star as you mature', 'Once adoption was proven, CSAT became the more honest signal.'],
  ['Make maintenance deliberate', 'Runbooks, sign-off, VAPT, monitoring, backups and handover docs. Graduation should be designed, not drifted into.'],
] as const

const hard = [
  ['Workflow problems are harder than paper problems', 'Paper was obvious. Dashboards, accountability, procurement, ILMS, data lakes and policy ownership were not. Digitising one layer reveals the next.'],
  ['Success created demand', 'Requests went from “please digitise this” to “can Armoury solve all these adjacent problems too?”'],
  ['Two user groups, two sets of needs', 'Frontliners wanted speed and low friction. HQ wanted aggregation, filters and decision support. Serving both meant constant prioritisation.'],
  ['Not every complaint is a UI problem', 'Part of the final CSAT gap came from operational policy. A product team should fix product friction, not pretend every policy is a design bug.'],
  ['Integration runs on the ecosystem’s clock', 'There was appetite to pipe Armoury data into SCDF’s Dataverse, but receiving-end constraints pushed it to around October 2026.'],
] as const

/** The source clip cuts to solid white from 14.28s; the loop dissolves back to the start before that. */
const LOOP_END = 14.2

export function Lessons() {
  const [tab, setTab] = useState<'worked' | 'hard'>('worked')
  const [open, setOpen] = useState(0)
  const items = tab === 'worked' ? worked : hard

  return (
    <>
    {/* Video hero: the section heading at headline size, white, over firefighters talking it through. A 20% black
        screen keeps the text readable, and the bottom fades into the page so it runs straight into the tabs below. */}
    <section aria-label="What worked, and what got hard" className="relative isolate mt-20 flex h-[min(80svh,760px)] min-h-[480px] items-center justify-center overflow-hidden bg-[#0d0d0d] px-5 text-center">
      <div aria-hidden className="absolute inset-0 -z-10 motion-reduce:hidden">
        <CrossfadeLoopVideo src={`${import.meta.env.BASE_URL}video/firefighters-discuss.mp4`} end={LOOP_END} fade={1.2} />
      </div>
      <div aria-hidden className="absolute inset-0 -z-10 bg-black/20" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[35%] bg-gradient-to-b from-transparent to-paper" />
      <div className="pb-16">
        <p className="kicker mb-4 !text-white">Lessons</p>
        <SplitReveal
          as="h2"
          variant="words"
          trigger="view"
          className="display m-0 mx-auto max-w-[14ch] text-white"
          style={{ fontSize: 'clamp(3rem, 9vw, 96px)' }}
        >
          What worked, and what got hard.
        </SplitReveal>
      </div>
    </section>

    <section aria-label="Lessons" className="mx-auto mb-20 max-w-[860px] px-5 pt-14">
      <div role="tablist" className="mb-6 flex gap-6 border-b border-rule">
        {(
          [
            ['worked', `What worked · ${worked.length}`],
            ['hard', `What broke or got hard · ${hard.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => {
              setTab(id)
              setOpen(0)
            }}
            className={`relative cursor-pointer pb-3 text-[14px] font-medium ${tab === id ? 'text-ink' : 'text-muted hover:text-ink'}`}
          >
            {label}
            {tab === id && <motion.span layoutId="lesson-tab" className="absolute right-0 bottom-[-1px] left-0 h-[2px] bg-[var(--accent)]" />}
          </button>
        ))}
      </div>
      <ol className="m-0 list-none p-0">
        {items.map(([title, body], i) => (
          <li key={title} className="border-b border-rule">
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              aria-expanded={open === i}
              className="flex w-full cursor-pointer items-baseline gap-5 py-4 text-left"
            >
              <span className="w-6 shrink-0 text-[16px] text-muted tabular">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex-1 font-serif text-[26px] leading-tight">{title}</span>
              <motion.span aria-hidden animate={{ rotate: open === i ? 45 : 0 }} className="text-[22px] text-muted">
                +
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {open === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="overflow-hidden"
                >
                  <p className="m-0 pb-5 pl-11 text-[16px] leading-relaxed text-ink-2">{body}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ol>
    </section>
    </>
  )
}
