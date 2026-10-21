import { motion, useScroll, useSpring } from 'motion/react'

const chapters = [
  ['#paper', 'Paper'],
  ['#origin', 'Origin'],
  ['#adoption', 'Adoption'],
  ['#admin-gap', 'Admin gap'],
  ['#last-mile', 'Last mile'],
  ['#numbers', 'Numbers'],
  ['#next', 'Next'],
] as const

export function Masthead() {
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30, mass: 0.3 })

  return (
    <div className="sticky top-0 z-40 bg-[#004b93] font-sans font-bold text-white">
      <div className="mx-auto flex h-12 max-w-[1240px] items-center justify-between gap-6 px-4 sm:px-8">
        <a href="#top" className="flex items-center no-underline">
          <img
            src={`${import.meta.env.BASE_URL}figma/armoury-logo.svg`}
            alt="Armoury"
            width={217}
            height={48}
            className="block h-5 w-auto"
          />
        </a>
        <nav aria-label="Chapters" className="hidden gap-5 text-[16px] lg:flex">
          {chapters.map(([href, label]) => (
            <a key={href} href={href} className="text-white no-underline transition-opacity hover:opacity-75">
              {label}
            </a>
          ))}
        </nav>
      </div>
      <motion.div
        className="absolute bottom-[-1px] left-0 h-[2px] w-full origin-left bg-[var(--accent)]"
        style={{ scaleX: progress }}
      />
    </div>
  )
}
