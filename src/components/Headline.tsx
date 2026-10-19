import { useState } from 'react'
import { useDialKit } from 'dialkit'
import { SplitReveal } from '@/components/SplitReveal'

export function Headline() {
  const [replay, setReplay] = useState(0)
  const type = useDialKit(
    'Title reveal',
    {
      stagger: [110, 20, 300, 5],
      duration: [1100, 300, 2400, 50],
      size: [96, 48, 140, 2],
      replay: { type: 'action' },
    },
    { onAction: () => setReplay((n) => n + 1) },
  )

  return (
    <header className="mx-auto max-w-[1100px] px-5 pt-14 pb-12 text-center sm:pt-20 sm:pb-16">
      <p className="kicker mb-6">Product story · Singapore Civil Defence Force</p>
      <SplitReveal
        as="h1"
        trigger="load"
        variant="lines"
        stagger={type.stagger}
        duration={type.duration}
        replayKey={replay}
        className="display mx-auto max-w-[14ch]"
        style={{ fontSize: `clamp(3rem, 9vw, ${type.size}px)` }}
      >
        Every check <em className="text-[var(--accent)]">matters.</em>
      </SplitReveal>
      <SplitReveal
        as="p"
        trigger="load"
        variant="words"
        delay={450}
        stagger={18}
        replayKey={replay}
        className="mx-auto mt-7 max-w-[34ch] font-serif text-[22px] leading-snug text-ink-2 sm:text-[26px]"
      >
        How a paper checklist problem became Armoury, the platform SCDF now uses every day to keep its
        emergency vehicles, equipment and frontline crews ready.
      </SplitReveal>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-muted">
        <span className="font-semibold text-ink">By the Armoury team, Open Government Products</span>
        <span aria-hidden>·</span>
        <time dateTime="2026-10">October 2026</time>
        <span aria-hidden>·</span>
        <span>9 min read</span>
      </div>
    </header>
  )
}
