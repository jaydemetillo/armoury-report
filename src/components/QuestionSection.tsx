import { SplitReveal } from '@/components/SplitReveal'

/**
 * "02 The question" from the Armoury Report Figma file (node 0:44): a paper
 * panel with a blue folder tab, the founding question, and the opening copy
 * in the left column. The right (photo) column is left blank for now.
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
          <p className="m-0 text-[18px] leading-[28px] font-light">
            Armoury began as a Hack for Public Good project in 2023 with a simple but consequential question:
          </p>

          <SplitReveal
            as="h2"
            variant="words"
            className="section-title m-0 mt-6 max-w-[1040px] lg:mt-8"
          >
            What if the equipment checks behind Singapore’s emergency response did not live on paper?
          </SplitReveal>

          <div className="mt-12 h-px bg-[#141414] lg:mt-[76px]" />

          <div className="mt-10 grid items-start gap-12 lg:mt-[41px] lg:grid-cols-[minmax(0,580px)_minmax(0,517px)] lg:justify-between lg:gap-8">
            <div className="text-[18px] leading-[1.65]">
              <p className="m-0">
                Every day, across Singapore, SCDF crews walk around their fire engines, ambulances and rescue
                appliances and check that everything is there and working, from hose couplings to breathing sets. Until
                recently, most of that work ended up in a binder.
              </p>
              <p className="m-0 mt-[1.35em]">
                By mid-2026, Armoury was a maintained, stable platform used at <strong>all 23 SCDF fire stations</strong>,
                covering <strong>100% of checklists</strong> for vehicles, equipment and PPE. It digitised
                high-frequency operational checks, made submissions visible in real time, and gave stations and HQ a
                shared, live view of readiness.
              </p>
              <p className="m-0 mt-[1.35em]">
                This isn’t only a story about a product. It’s about a different way to build in government: start
                small, test with real users, find where the real problem is, and keep iterating until the product
                proves its value or tells you what to do next.
              </p>
            </div>

            {/* Photo column: intentionally blank until the photo is chosen. */}
            <div aria-hidden className="hidden lg:block" />
          </div>

          <div className="mt-12 h-px bg-[#141414] lg:mt-[42px]" />
        </div>
      </div>
    </section>
  )
}

