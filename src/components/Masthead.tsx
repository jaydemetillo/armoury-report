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
    <div className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex h-12 max-w-[1240px] items-center justify-between gap-6 px-4 sm:px-8">
        <a href="#top" className="font-serif text-[22px] leading-none tracking-tight text-ink no-underline">
          Armoury
        </a>
        <nav aria-label="Chapters" className="hidden gap-5 text-[13px] text-muted lg:flex">
          {chapters.map(([href, label]) => (
            <a key={href} href={href} className="no-underline transition-colors hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
        <span className="text-[12px] tracking-[0.14em] text-muted uppercase">OGP Stories</span>
      </div>
      <motion.div
        className="absolute bottom-[-1px] left-0 h-[2px] w-full origin-left bg-[var(--accent)]"
        style={{ scaleX: progress }}
      />
    </div>
  )
}
