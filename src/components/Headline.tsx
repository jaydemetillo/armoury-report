import { useState } from 'react'
import { useDialKit } from 'dialkit'
import { HeroIntroChecklist } from '@/components/HeroIntroChecklist'
import { SplitReveal } from '@/components/SplitReveal'

// The hero intro checklist (folder illustration) is hidden for now, and the
// text centres. Set to true to bring it back beside left-aligned text.
const SHOW_HERO_INTRO_CHECKLIST = false

export function Headline() {
  const centred = !SHOW_HERO_INTRO_CHECKLIST
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
    <header className="relative isolate overflow-hidden bg-[#0d0d0d] text-white">
      {/* Background video, dropped to 30% so the text on top stays readable. Decorative, so hidden from assistive tech. */}
      <video
        aria-hidden
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-30 motion-reduce:hidden"
        src={`${import.meta.env.BASE_URL}video/header-hero.mp4`}
      />
      <div
        className={`mx-auto grid max-w-[1280px] items-center gap-12 px-5 pt-12 pb-16 sm:px-8 lg:gap-16 lg:pt-16 lg:pb-20 ${
          centred ? 'text-center' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)]'
        }`}
      >
        <div>
          <p className="kicker mb-6 !text-white">Product story · Singapore Civil Defence Force</p>
          <SplitReveal
            as="h1"
            trigger="load"
            variant="lines"
            stagger={type.stagger}
            duration={type.duration}
            replayKey={replay}
            className={`display max-w-[14ch] ${centred ? 'mx-auto' : ''}`}
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
            className={`mt-7 max-w-[34ch] ${centred ? 'mx-auto' : ''} font-serif text-[22px] leading-snug text-white/75 sm:text-[26px]`}
          >
            How a paper checklist problem became Armoury, the platform SCDF now uses every day to keep its
            emergency vehicles, equipment and frontline crews ready.
          </SplitReveal>
          <div className="mt-9 flex flex-col items-center gap-1 text-center text-[14px] text-white/55">
            <span className="font-semibold text-white">By the Armoury team, Open Government Products</span>
            <div className="flex items-center gap-x-4">
              <time dateTime="2026-10">October 2026</time>
              <span aria-hidden>·</span>
              <span>9 min read</span>
            </div>
          </div>
        </div>
        {SHOW_HERO_INTRO_CHECKLIST && <HeroIntroChecklist className="mx-auto max-w-[420px] lg:max-w-[520px]" />}
      </div>
    </header>
  )
}
