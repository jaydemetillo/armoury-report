import { useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'

interface Photo {
  src: string
  alt: string
}

interface PhotoCarouselProps {
  photos: Photo[]
  caption: string
}

/** Share of the frame's width each slide takes (so the next photo always peeks in): wider on phones, narrower on desktop. */
const slideShare = (frameWidth: number) => (frameWidth < 640 ? 0.82 : frameWidth < 1024 ? 0.66 : 0.5)
const GAP = 16
/** Space between the viewport edge and the first / last photo: the page margin on desktop, never under 20px. */
const edgePad = (frameWidth: number) => (frameWidth < 640 ? 20 : frameWidth < 1024 ? 32 : 80)

/**
 * A row of photos that slides sideways as the figure travels up the screen: scrolling down carousels through all of
 * them. The motion is tied straight to scroll position (lightly smoothed), so it never runs ahead of or behind the page.
 */
export function PhotoCarousel({ photos, caption }: PhotoCarouselProps) {
  const ref = useRef<HTMLElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const [travel, setTravel] = useState(0)
  const [slideW, setSlideW] = useState(0)
  const [pad, setPad] = useState(20)

  // How far the strip has to move so the last photo ends flush with the frame's right edge.
  useLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      const p = edgePad(w)
      const sw = (w - 2 * p) * slideShare(w)
      setPad(p)
      setSlideW(sw)
      // The strip carries the edge padding on both sides, so the last photo stops `p` short of the right edge.
      setTravel(Math.max(0, photos.length * sw + (photos.length - 1) * GAP + 2 * p - w))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [photos.length])

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 55%', 'end 30%'] })
  const eased = useSpring(scrollYProgress, { stiffness: 160, damping: 32, mass: 0.4 })
  // The first 20% of the scroll is a hold, so the opening photo sits still and can be seen before the strip starts to move.
  const x = useTransform(eased, [0.2, 1], [0, -travel])

  return (
    <figure ref={ref} className="my-14 w-full">
      <div
        ref={frame}
        // The frame clips sideways movement; its vertical padding (cancelled by the negative margin) leaves room for the shadows.
        className={`-my-10 ${reduce ? 'overflow-x-auto' : 'overflow-hidden'}`}
        role="group"
        aria-roledescription="carousel"
        aria-label="Photos from SCDF stations"
      >
        <motion.div className="flex w-max py-10 will-change-transform" style={{ x: reduce ? 0 : x, gap: GAP, paddingInline: pad }}>
          {photos.map((p) => (
            <img
              key={p.src}
              src={p.src}
              alt={p.alt}
              loading="lazy"
              draggable={false}
              className="block aspect-[4/3] shrink-0 lg:aspect-[3/2] rounded-[12px] bg-paper-2 object-cover shadow-[0_14px_36px_-8px_rgb(0_0_0/0.28),0_4px_14px_rgb(0_0_0/0.1)]"
              style={{ width: slideW || 280 }}
            />
          ))}
        </motion.div>
      </div>
      <figcaption className="mt-4 text-center" style={{ paddingInline: pad }}>
        <span className="font-sans text-[16px] leading-snug font-bold text-white">{caption}</span>
      </figcaption>
    </figure>
  )
}
