import type { CSSProperties, ReactNode } from 'react'

/**
 * "05 Before Armoury" from the Armoury Report Figma file (node 0:59): the blue
 * grid with the three clipped paper cards. Article content passed as children
 * continues below the cards on the same grid, in white (see `.on-blue` in
 * index.css).
 */
const cards = [
  {
    no: 'NO. 1',
    title: 'The work was slow and repetitive.',
    body: 'Frontliners had to complete physical checks, often around vehicles, hoses, water, and equipment, then record them on paper.',
    rotate: 1,
    offset: 40,
  },
  {
    no: 'NO. 2',
    title: 'The data was trapped.',
    body: 'Close to 40,000 checks were happening, but the information could not be easily analysed, compared, searched, or used to spot patterns.',
    rotate: -1,
    offset: 76,
  },
  {
    no: 'NO. 3',
    title: 'Every station had its own version.',
    body: 'Stations could modify and print their own checklists, creating inconsistencies across the force. Some forms would even reference older equipment models.',
    rotate: 1,
    offset: 0,
  },
]

const base = import.meta.env.BASE_URL

export function ProblemSection({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="The problem"
      className="relative bg-[#004b93] pt-16 pb-24 text-[#f3eee2] lg:pt-[84px] lg:pb-32"
      style={{ backgroundImage: `url(${base}figma/problem-grid.svg)`, backgroundSize: '1440px 1160px', backgroundRepeat: 'repeat' }}
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-[80px]">
        <p className="m-0 font-['Courier_Prime',ui-monospace,monospace] text-[14px] leading-normal font-bold tracking-[1.12px]">
          02 / THE PROBLEM
        </p>
        <h2 className="m-0 mt-6 font-serif text-[clamp(3.5rem,9vw,110px)] leading-[0.95] font-normal tracking-[-0.01em] lg:mt-[29px] lg:leading-[104px]">
          Paper won’t cut it
        </h2>
        <p className="m-0 mt-6 max-w-[613px] font-['Libre_Caslon_Text',Georgia,serif] text-[19px] leading-[1.55] sm:text-[22px] sm:leading-[34px] lg:mt-[34px]">
          Before Armoury, much of this work lived in binders, printed Excel sheets, station-level templates, and manual
          follow-ups. That meant three things.
        </p>

        <ol className="m-0 mt-14 grid list-none justify-center gap-12 p-0 lg:mt-[82px] lg:grid-cols-[repeat(3,390px)] lg:justify-between lg:gap-0">
          {cards.map((card) => (
            <li key={card.no} className="lg:mt-[var(--offset)]" style={{ '--offset': `${card.offset}px` } as CSSProperties}>
              <article
                className="relative mx-auto w-full max-w-[390px] rounded-[4px] bg-[#fbf8f0] bg-cover bg-center px-[36px] pt-[56px] pb-12 text-[#141414] lg:h-[520px]"
                style={{ backgroundImage: `url(${base}figma/question-paper.png)`, transform: `rotate(${card.rotate}deg)` }}
              >
                <img
                  src={`${base}figma/paperclip.svg`}
                  alt=""
                  width={24}
                  height={64}
                  className="absolute top-[-18px] right-[66px] block"
                />
                <p className="m-0 font-['Courier_Prime',ui-monospace,monospace] text-[15px] leading-normal font-bold tracking-[1.2px] text-[#c8372d]">
                  {card.no}
                </p>
                <div className="mt-[11px] h-[2px] max-w-[318px] bg-[#141414]" />
                <h3 className="m-0 mt-[18px] max-w-[330px] font-serif text-[44px] leading-[1] font-normal tracking-[-0.5px] sm:text-[50px] sm:leading-[50px]">
                  {card.title}
                </h3>
                <p className="m-0 mt-8 max-w-[318px] font-['Libre_Caslon_Text',Georgia,serif] text-[18px] leading-[28px]">
                  {card.body}
                </p>
              </article>
            </li>
          ))}
        </ol>
      </div>

      <div className="on-blue mt-16 lg:mt-24">{children}</div>
    </section>
  )
}
