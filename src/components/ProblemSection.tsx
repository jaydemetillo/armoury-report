import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/**
 * "05 Before Armoury" from the Armoury Report Figma file (node 0:59): the blue
 * grid with the three clipped paper cards. Article content passed as children
 * continues below the cards on the same grid, in white (see `.on-blue` in
 * index.css).
 */
const cards = [
  {
    no: 'No. 1',
    title: 'The work was slow and repetitive.',
    body: 'Frontliners had to complete physical checks, often around vehicles, hoses, water, and equipment, then record them on paper.',
    rotate: 1,
    offset: 40,
  },
  {
    no: 'No. 2',
    title: 'The data was trapped.',
    body: 'Close to 40,000 checks were happening, but the information could not be easily analysed, compared, searched, or used to spot patterns.',
    rotate: -1,
    offset: 76,
  },
  {
    no: 'No. 3',
    title: 'Every station had its own version.',
    body: 'Stations could modify and print their own checklists, creating inconsistencies across the force. Some forms would even reference older equipment models.',
    rotate: 1,
    offset: 0,
  },
]

const base = import.meta.env.BASE_URL

type CardData = (typeof cards)[number]

/**
 * One paper card. Each card eases up into place once, a little after the one before it, as the row scrolls into view:
 * a short, soft slide with no fade and no parallax.
 */
function PaperCard({ card, index }: { card: CardData; index: number }) {
  const reduce = useReducedMotion()

  return (
    <motion.article
      className="relative mx-auto w-full max-w-[390px] px-[36px] pt-[56px] pb-12 text-[#141414] lg:h-[520px]"
      style={{ rotate: card.rotate }}
      initial={reduce ? false : { y: 36 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: index * 0.14 }}
    >
      <div
        aria-hidden
        className="absolute inset-0 rounded-[4px] bg-[#fbf8f0] bg-cover bg-center"
        style={{ backgroundImage: `url(${base}figma/question-paper.png)` }}
      >
        <img src={`${base}figma/paperclip.svg`} alt="" width={24} height={64} className="absolute top-[-18px] right-[66px] block" />
      </div>
      <p className="relative m-0 font-sans text-[14px] leading-normal font-semibold text-[#c8372d]">{card.no}</p>
      <div className="relative mt-[11px] h-[2px] max-w-[318px] bg-[#141414]" />
      <h3 className="relative m-0 mt-[18px] max-w-[330px] font-serif text-[44px] leading-[1] font-normal tracking-[-0.5px] sm:text-[50px] sm:leading-[50px]">
        {card.title}
      </h3>
      <p className="relative m-0 mt-8 max-w-[318px] font-['Libre_Caslon_Text',Georgia,serif] text-[16px] leading-[28px]">
        {card.body}
      </p>
    </motion.article>
  )
}

export function ProblemSection({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="The problem"
      className="relative bg-[#004b93] pt-16 pb-24 text-[#f3eee2] lg:pt-[84px] lg:pb-32"
    >
      {/* The blueprint grid sits behind the heading and cards, then fades out into plain blue before chapter 01 begins. */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-x-0 -top-16 -bottom-16 lg:-top-[84px] lg:-bottom-24"
          style={{
            backgroundImage: `url(${base}figma/problem-grid.svg)`,
            backgroundSize: '1440px 1160px',
            backgroundRepeat: 'repeat',
            maskImage: 'linear-gradient(to bottom, #000 calc(100% - 360px), transparent)',
            WebkitMaskImage: 'linear-gradient(to bottom, #000 calc(100% - 360px), transparent)',
          }}
        />
      <div className="relative mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-[80px]">
        <p className="m-0 font-sans text-[14px] leading-normal font-semibold">
          02 / The problem
        </p>
        <h2 className="m-0 mt-6 font-serif text-[clamp(3.5rem,9vw,110px)] leading-[0.95] font-normal tracking-[-0.01em] lg:mt-[29px] lg:leading-[104px]">
          Paper won’t cut it
        </h2>
        <p className="m-0 mt-6 max-w-[613px] font-['Libre_Caslon_Text',Georgia,serif] text-[16px] leading-[1.55] sm:text-[22px] sm:leading-[34px] lg:mt-[34px]">
          Before Armoury, much of this work lived in binders, printed Excel sheets, station-level templates, and manual
          follow-ups. That meant three things.
        </p>

        <ol className="m-0 mt-14 grid list-none justify-center gap-12 p-0 lg:mt-[82px] lg:grid-cols-[repeat(3,390px)] lg:justify-between lg:gap-0">
          {cards.map((card, index) => (
            <li key={card.no} className="lg:mt-[var(--offset)]" style={{ '--offset': `${card.offset}px` } as CSSProperties}>
              <PaperCard card={card} index={index} />
            </li>
          ))}
        </ol>
      </div>
      </div>

      <div className="on-blue mt-16 lg:mt-24">{children}</div>
    </section>
  )
}
