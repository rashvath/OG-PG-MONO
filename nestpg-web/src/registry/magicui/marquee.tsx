import type { ReactNode } from 'react'

type MarqueeProps = {
  children: ReactNode
  className?: string
  pauseOnHover?: boolean
}

export function Marquee({ children, className, pauseOnHover = false }: MarqueeProps) {
  return (
    <div className={`app-marquee ${pauseOnHover ? 'pause-on-hover' : ''} ${className ?? ''}`.trim()}>
      <div className="app-marquee-track">
        <div className="app-marquee-inner">{children}</div>
        <div className="app-marquee-inner" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  )
}
