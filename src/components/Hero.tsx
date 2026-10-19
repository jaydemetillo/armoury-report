import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'motion/react'
import type { ImageGenerationHandle } from 'img-fx'
import { useDialKit } from 'dialkit'
import { SafeImageGeneration } from '@/components/SafeImageGeneration'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { CarouselDots } from '@/components/ui/carousel-dots'

const slides = [
  {
    src: `${import.meta.env.BASE_URL}images/station.jpg`,
    kicker: 'The daily ritual',
    title: 'Before duty calls, everything gets checked.',
    body: 'Every day, at least 600 on-duty SCDF officers account for around 350 emergency vehicles and vessels: fire engines, ambulances, rescue appliances, gear and PPE.',
  },
  {
    src: `${import.meta.env.BASE_URL}images/binders.jpg`,
    kicker: 'Problem 01',
    title: 'The work was slow and repetitive.',
    body: 'Crews checked hoses, water and equipment around the truck, then wrote it all down again on paper and filed it in station binders.',
  },
  {
    src: `${import.meta.env.BASE_URL}images/hoses.jpg`,
    kicker: 'Problem 02',
    title: 'The data was trapped.',
    body: 'Close to 40,000 checks were happening, but nobody could search, compare or analyse them to spot a pattern.',
  },
  {
    src: `${import.meta.env.BASE_URL}images/night.jpg`,
    kicker: 'Problem 03',
    title: 'HQ had limited visibility.',
    body: 'Each station downloaded, edited and printed its own checklists. Some paper forms still described older equipment models.',
  },
]

export function Hero() {
  const [slide, setSlide] = useState(0)
  // The slide fading out keeps its shader until the cross-fade ends; every other
  // slide is a plain image, so at most two WebGL contexts exist at once.
  const [leaving, setLeaving] = useState<number | null>(null)
  const [hovering, setHovering] = useState(false)
  const handles = useRef<(ImageGenerationHandle | null)[]>([])
  const sectionRef = useRef<HTMLElement>(null)
  // Shaders pause once the hero is off-screen, so they never compete with
  // the scrollytelling further down for GPU time.
  const inView = useInView(sectionRef)
  // Phones get plain cross-fading photos instead of the WebGL loader.
  const isMobile = useIsMobile()

  const dial = useDialKit('Hero', {
    autoplaySeconds: [7, 3, 14, 0.5],
    overlay: [0.55, 0, 0.9, 0.05],
    cardBlur: [18, 0, 40, 1],
    cardOpacity: [0.72, 0.2, 1, 0.02],
    loader: {
      preset: { type: 'select', options: ['sweep-gradient', 'pixels-organic', 'pixels-mechanic'] },
      pixelScale: [1.4, 0.5, 3, 0.1],
      strength: [1, 0, 1, 0.05],
    },
    accent: '#c8102e',
  })

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', dial.accent)
  }, [dial.accent])

  // Each slide "generates" its photo when it becomes current; the previous one returns to the shader.
  useEffect(() => {
    const current = handles.current[slide]
    const timer = window.setTimeout(() => current?.triggerReveal({ hold: 'manual' }), 250)
    return () => {
      window.clearTimeout(timer)
      current?.triggerHide()
    }
  }, [slide, dial.loader.preset])

  useEffect(() => {
    if (leaving === null) return
    const timer = window.setTimeout(() => setLeaving(null), 1200)
    return () => window.clearTimeout(timer)
  }, [leaving])

  const goTo = (next: number) => {
    if (next === slide) return
    setLeaving(slide)
    setSlide(next)
  }

  const active = slides[slide]

  return (
    <section
      ref={sectionRef}
      aria-label="Before Armoury"
      className="relative h-[92svh] min-h-[620px] w-full overflow-hidden bg-night text-white"
    >
      {slides.map((s, index) => (
        <motion.div
          key={s.src}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: index === slide ? 1 : 0, scale: index === slide ? 1 : 1.04 }}
          transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1] }}
          aria-hidden={index !== slide}
        >
          {!isMobile && (index === slide || index === leaving) ? (
            <SafeImageGeneration
              key={dial.loader.preset}
              ref={(h) => {
                handles.current[index] = h
              }}
              preset={dial.loader.preset as 'sweep-gradient' | 'pixels-organic' | 'pixels-mechanic'}
              images={[s.src]}
              fallbackSrc={s.src}
              theme="dark"
              cardBg="#0d1117"
              pixelScale={dial.loader.pixelScale}
              strength={dial.loader.strength}
              borderRadius={0}
              paused={!inView}
              className="!absolute inset-0"
            >
              <div style={{ width: '100%', height: '100%' }} />
            </SafeImageGeneration>
          ) : (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${s.src})` }} />
          )}
        </motion.div>
      ))}

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `linear-gradient(180deg, rgb(13 17 23 / ${dial.overlay * 0.4}) 0%, rgb(13 17 23 / ${dial.overlay * 0.2}) 45%, rgb(13 17 23 / ${dial.overlay}) 100%)`,
        }}
      />

      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[1240px] items-end justify-between gap-6 px-4 pb-8 sm:px-8 sm:pb-12">
        <div
          className="w-full max-w-[460px] rounded-2xl border border-white/10 p-6 sm:p-7"
          style={{
            background: `rgb(13 17 23 / ${dial.cardOpacity})`,
            backdropFilter: `blur(${dial.cardBlur}px) saturate(1.2)`,
            WebkitBackdropFilter: `blur(${dial.cardBlur}px) saturate(1.2)`,
          }}
          onPointerEnter={() => setHovering(true)}
          onPointerLeave={() => setHovering(false)}
        >
          <div className="mb-4 flex items-center justify-between text-xs font-semibold tracking-[0.16em] uppercase">
            <span style={{ color: 'color-mix(in oklab, var(--accent) 70%, white)' }}>Before Armoury</span>
            <span className="tabular text-white/55">
              {String(slide + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={slide}
              initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(6px)' }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
              aria-live="polite"
            >
              <p className="mb-1 text-[13px] text-white/60">{active.kicker}</p>
              <h2 className="font-serif text-[30px] leading-[1.05] sm:text-[34px]">{active.title}</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-white/80">{active.body}</p>
            </motion.div>
          </AnimatePresence>
          <CarouselDots
            className="mt-5 -ml-[5px] text-white"
            count={slides.length}
            value={slide}
            onValueChange={goTo}
            autoplay={{ duration: dial.autoplaySeconds * 1000, paused: hovering }}
            getLabel={(i) => `Show: ${slides[i].title}`}
          />
        </div>
        <p className="credit hidden max-w-[220px] text-right !text-white/50 md:block">
          Illustrations are placeholders for SCDF station photography.
        </p>
      </div>
    </section>
  )
}
