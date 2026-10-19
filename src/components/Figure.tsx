import { useEffect, useRef } from 'react'
import { motion, useInView } from 'motion/react'
import type { ImageGenerationHandle } from 'img-fx'
import { SafeImageGeneration } from '@/components/SafeImageGeneration'
import { useIsMobile } from '@/hooks/use-is-mobile'

interface FigureProps {
  src: string
  alt: string
  caption: string
  credit?: string
  wide?: boolean
}

/**
 * An inline photo that "generates" in with img-fx once it scrolls into view.
 * Phones get a plain fade-in instead of the WebGL effect.
 */
export function Figure({ src, alt, caption, credit, wide }: FigureProps) {
  const ref = useRef<HTMLElement>(null)
  const handle = useRef<ImageGenerationHandle>(null)
  const revealed = useInView(ref, { once: true, margin: '0px 0px -20% 0px' })
  // Freeze the shader whenever the figure is off-screen.
  const onScreen = useInView(ref)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (revealed) handle.current?.triggerReveal({ hold: 'manual' })
  }, [revealed, isMobile])

  const frame = { width: '100%', aspectRatio: '16 / 10', borderRadius: 14 }

  return (
    <figure ref={ref} className={wide ? 'mx-auto my-16 max-w-[1100px] px-5' : 'mx-auto my-14 max-w-[760px] px-5'}>
      {isMobile ? (
        <motion.div
          role="img"
          aria-label={alt}
          className="bg-paper-2 bg-cover bg-center"
          style={{ ...frame, backgroundImage: `url(${src})` }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={revealed ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
        />
      ) : (
        <SafeImageGeneration
          fallbackSrc={src}
          fallbackStyle={{ borderRadius: 14 }}
          ref={handle}
          preset="sweep-gradient"
          images={[src]}
          cardBg="#e3ddd0"
          theme="light"
          paused={!onScreen}
          className="w-full"
        >
          <div role="img" aria-label={alt} style={frame} />
        </SafeImageGeneration>
      )}
      <figcaption className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1">
        <span className="text-[14px] leading-snug text-ink-2">{caption}</span>
        {credit && <span className="credit">{credit}</span>}
      </figcaption>
    </figure>
  )
}
