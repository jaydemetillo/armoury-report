import { useEffect, useRef } from 'react'
import { useInView } from 'motion/react'
import { ImageGeneration, type ImageGenerationHandle } from 'img-fx'

interface FigureProps {
  src: string
  alt: string
  caption: string
  credit?: string
  wide?: boolean
}

/** An inline photo that "generates" in with img-fx once it scrolls into view. */
export function Figure({ src, alt, caption, credit, wide }: FigureProps) {
  const ref = useRef<HTMLElement>(null)
  const handle = useRef<ImageGenerationHandle>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -20% 0px' })

  useEffect(() => {
    if (inView) handle.current?.triggerReveal({ hold: 'manual' })
  }, [inView])

  return (
    <figure ref={ref} className={wide ? 'mx-auto my-16 max-w-[1100px] px-5' : 'mx-auto my-14 max-w-[760px] px-5'}>
      <ImageGeneration
        ref={handle}
        preset="sweep-gradient"
        images={[src]}
        cardBg="#e3ddd0"
        theme="light"
        className="w-full"
      >
        <div role="img" aria-label={alt} style={{ width: '100%', aspectRatio: '16 / 10', borderRadius: 14 }} />
      </ImageGeneration>
      <figcaption className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1">
        <span className="text-[14px] leading-snug text-ink-2">{caption}</span>
        {credit && <span className="credit">{credit}</span>}
      </figcaption>
    </figure>
  )
}
