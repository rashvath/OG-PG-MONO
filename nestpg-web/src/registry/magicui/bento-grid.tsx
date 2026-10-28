import type { ComponentType, ReactNode } from 'react'

type IconType = ComponentType<{ width?: number; height?: number; className?: string }>

type BentoGridProps = {
  children: ReactNode
}

type BentoCardProps = {
  Icon: IconType
  name: string
  description: string
  href?: string
  cta?: string
  className?: string
  background?: ReactNode
}

export function BentoGrid({ children }: BentoGridProps) {
  return <section className="bento-grid">{children}</section>
}

export function BentoCard({ Icon, name, description, href = '#', cta = 'Learn more', className, background }: BentoCardProps) {
  return (
    <article className={`bento-card ${className ?? ''}`.trim()}>
      <div className="bento-card-bg">{background}</div>
      <div className="bento-card-content">
        <span className="bento-icon-wrap">
          <Icon width={18} height={18} />
        </span>
        <h3>{name}</h3>
        <p>{description}</p>
        <a href={href} className="bento-link">
          {cta}
        </a>
      </div>
    </article>
  )
}
