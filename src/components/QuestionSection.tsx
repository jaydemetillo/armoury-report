import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { SplitReveal } from '@/components/SplitReveal'

/** Landscape photo (4:3 when stacked; stretches to the text column's height beside it) that drifts slightly slower than the page as you scroll (a gentle parallax). */
function ParallaxPhoto() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-7%', '7%'])

  return (
    <figure ref={ref} className="relative m-0 aspect-[4/3] w-full overflow-hidden rounded-[12px] bg-[#e4dfd3] lg:aspect-auto lg:h-full">
      <motion.img
        src={`${import.meta.env.BASE_URL}images/paper-binder-check.jpg`}
        alt="Firefighters checking a paper binder of equipment checklists beside an open fire engine compartment"
        loading="lazy"
        className="absolute inset-x-0 top-[-9%] block h-[118%] w-full object-cover object-[28%_58%]"
        style={reduce ? undefined : { y }}
      />
    </figure>
  )
}

/**
 * "01 / The question": the founding question and the opening copy. Laid out like the other numbered sections
 * (label, heading, content on the page background) on black with white text and rules (no panel, tab or paper texture). It sits above the journey's fire truck, which slides out from beneath its bottom edge. The right column holds a square
 * parallax photo.
 */
export function QuestionSection() {
  return (
    <section aria-label="The question" className="relative z-10 bg-black pt-16 pb-24 text-white lg:pt-[84px] lg:pb-32">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-[80px]">
        <p className="m-0 font-sans text-[14px] leading-normal font-semibold text-white">01 / The question</p>

        <div className="mt-6 lg:mt-[29px]">
          <p className="m-0 text-[14px] leading-[22px] font-light">
            Armoury began as a Hack for Public Good project in 2023 with a simple but consequential question:
          </p>

          <SplitReveal
            as="h2"
            variant="words"
            className="section-title m-0 mt-6 max-w-[1040px] lg:mt-8"
          >
            What if the equipment checks behind Singapore’s emergency response did not live on paper?
          </SplitReveal>

          <div className="mt-12 h-px bg-white lg:mt-[76px]" />

          <div className="mt-10 grid items-stretch gap-12 lg:mt-[41px] lg:grid-cols-2 lg:gap-16">
            <div className="text-[16px] leading-[1.65]">
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

            <ParallaxPhoto />
          </div>

          <div className="mt-12 h-px bg-white lg:mt-[42px]" />
        </div>
      </div>
    </section>
  )
}

