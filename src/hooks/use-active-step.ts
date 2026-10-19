import { useEffect, useRef, useState } from 'react'

/**
 * Scrollytelling driver: returns refs for each step and the index of the step
 * whose box currently crosses the middle of the viewport.
 */
export function useActiveStep(count: number) {
  const refs = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const index = refs.current.indexOf(entry.target as HTMLElement)
            if (index !== -1) setActive(index)
          }
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    )
    for (const el of refs.current.slice(0, count)) if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [count])

  const setRef = (index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el
  }

  return { active, setRef }
}
