import { SplitReveal } from '@/components/SplitReveal'

/**
 * "02 The question" from the Armoury Report Figma file (node 0:44): a paper
 * panel with a blue folder tab, the founding question, and the opening copy
 * beside a taped photograph (a placeholder until the photo is chosen).
 */
export function QuestionSection() {
  return (
    // Top padding = bottom padding + the tab's height above the panel, so the
    // space above the tab equals the space below the panel.
    <section
      aria-label="The question"
      className="relative overflow-hidden bg-[#f3eee2] bg-cover bg-center px-3 pt-[110px] pb-16 sm:px-6 lg:px-[44px] lg:pt-[158px] lg:pb-[100px]"
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}figma/question-paper.png)` }}
    >
      <div className="relative mx-auto max-w-[1356px]">
        {/* Folder tab, tucked behind the panel's top edge */}
        <div className="absolute -top-[46px] left-4 h-[64px] rounded-[16px] border-2 border-[#141414] bg-[#004b93] px-5 pt-[12px] sm:left-6 lg:-top-[58px] lg:left-[36px] lg:h-[77px] lg:w-[265px] lg:rounded-[20px] lg:px-[32px] lg:pt-[17px]">
          <p className="m-0 text-[14px] leading-normal font-semibold tracking-[0.08em] whitespace-nowrap text-[#fbf8f0] lg:text-[20px] lg:tracking-[1.6px]">
            01 / THE QUESTION
          </p>
        </div>

        <div className="relative rounded-[16px] border-2 border-[#141414] bg-[#fbf8f0] px-5 pt-10 pb-12 text-[#141414] sm:px-10 lg:rounded-[20px] lg:pt-[78px] lg:pr-[86px] lg:pb-[74px] lg:pl-[82px]">
          <p className="m-0 text-[19px] leading-[1.5] font-light sm:text-[24px] sm:leading-[36px]">
            Armoury began as a Hack for Public Good project in 2023 with a simple but consequential question:
          </p>

          <SplitReveal
            as="h2"
            variant="words"
            className="m-0 mt-6 max-w-[1040px] font-serif text-[clamp(2.5rem,6.2vw,84px)] leading-[1] font-normal tracking-[-0.01em] lg:mt-8 lg:leading-[84px]"
          >
            What if the equipment checks behind Singapore’s emergency response did not live on paper?
          </SplitReveal>

          <div className="mt-12 h-px bg-[#141414] lg:mt-[76px]" />

          <div className="mt-10 grid items-start gap-12 lg:mt-[41px] lg:grid-cols-[minmax(0,580px)_minmax(0,517px)] lg:justify-between lg:gap-8">
            <div className="text-[17px] leading-[1.7] sm:text-[20px] sm:leading-[32px]">
              <p className="m-0">
                Every day, across Singapore, SCDF crews walk around their fire engines, ambulances and rescue
                appliances and check that everything is there and working, from hose couplings to breathing sets. Until
                recently, most of that work ended up in a binder.
              </p>
              <p className="m-0 mt-8">
                By mid-2026, Armoury was a maintained, stable platform used at <strong>all 23 SCDF fire stations</strong>,
                covering <strong>100% of checklists</strong> for vehicles, equipment and PPE. It digitised
                high-frequency operational checks, made submissions visible in real time, and gave stations and HQ a
                shared, live view of readiness.
              </p>
              <p className="m-0 mt-8">
                This isn’t only a story about a product. It’s about a different way to build in government: start
                small, test with real users, find where the real problem is, and keep iterating until the product
                proves its value or tells you what to do next.
              </p>
            </div>

            <PhotoPlaceholder />
          </div>

          <div className="mt-12 h-px bg-[#141414] lg:mt-[42px]" />
        </div>
      </div>
    </section>
  )
}

/** "Photograph 02": a taped polaroid. The photo itself is left as a placeholder for now. */
function PhotoPlaceholder() {
  return (
    <figure className="m-0 mx-auto w-full max-w-[500px] lg:mt-[2px]">
      <div
        className="relative w-full rounded-[2px] bg-[#fffbf5]"
        style={{ aspectRatio: '500 / 373', transform: 'rotate(-2.7deg)', filter: 'drop-shadow(0px 8px 9px rgba(0,0,0,0.22))' }}
      >
        <div
          className="absolute grid place-items-center border border-dashed border-[#b9b2a0] bg-[#ece6d8]"
          style={{ left: '2.8%', top: '3.75%', width: '94.4%', height: '75.34%' }}
        >
          <span className="font-['Courier_Prime',ui-monospace,monospace] text-[13px] tracking-[0.03em] text-[#8a8270] uppercase">
            Photo placeholder
          </span>
        </div>
        <figcaption
          className="absolute font-['Courier_Prime',ui-monospace,monospace] text-[11px] leading-normal tracking-[0.39px] whitespace-pre text-[#141414] sm:text-[13px]"
          style={{ left: '2.8%', top: '83.4%' }}
        >
          {'FIG.1  /  Checking a vehicle compartment'}
        </figcaption>
        {/* Tape */}
        <div
          aria-hidden
          className="absolute top-[-10px] left-1/2 h-[34px] bg-[#f7e062] opacity-80"
          style={{ width: '24%', transform: 'translateX(-50%) rotate(4deg)' }}
        />
      </div>
    </figure>
  )
}
