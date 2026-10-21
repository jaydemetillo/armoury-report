import { SplitReveal } from '@/components/SplitReveal'
import { cn } from '@/lib/utils'

interface PullQuoteProps {
  children: string
  cite?: string
  size?: 'lg' | 'xl'
  tone?: 'light' | 'dark'
}

export function PullQuote({ children, cite, size = 'lg', tone = 'light' }: PullQuoteProps) {
  return (
    <figure className={cn('mx-auto my-20 max-w-[920px] px-5 text-center sm:my-28', tone === 'dark' && 'text-white')}>
      <span
        aria-hidden
        className="mx-auto mb-6 block h-10 w-px"
        style={{ background: 'var(--accent)' }}
      />
      <SplitReveal
        as="blockquote"
        variant="words"
        className={cn(
          'display m-0',
          size === 'xl' ? 'text-[clamp(2.6rem,7vw,5.5rem)]' : 'text-[clamp(2rem,5vw,3.75rem)] !leading-[1.05]',
        )}
      >
        {`“${children}”`}
      </SplitReveal>
      {cite && (
        <figcaption className={cn('credit mt-6', tone === 'dark' && '!text-white/55')}>
          {cite}
        </figcaption>
      )}
    </figure>
  )
}
