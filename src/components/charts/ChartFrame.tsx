import type { ReactNode } from 'react'

interface ChartFrameProps {
  title: string
  subtitle?: string
  source: string
  children: ReactNode
  className?: string
}

export function ChartFrame({ title, subtitle, source, children, className }: ChartFrameProps) {
  return (
    <figure className={className ?? 'mx-auto my-14 max-w-[760px] px-5'}>
      <figcaption className="mb-4">
        <div className="text-[16px] leading-snug font-semibold text-ink">{title}</div>
        {subtitle && <div className="mt-0.5 text-[16px] text-muted">{subtitle}</div>}
      </figcaption>
      {children}
      <p className="credit !text-[12px] mt-3">Source: {source}</p>
    </figure>
  )
}
