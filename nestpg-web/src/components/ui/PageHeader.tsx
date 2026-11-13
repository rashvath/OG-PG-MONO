import type { ReactNode } from 'react'

import { cn } from '@/helpers/utils'

type PageHeaderProps = {
  title: string
  subtitle?: string
  action?: ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex items-start justify-between gap-4', className)}>
      <div>
        <h1 className="text-md font-bold text-text">{title}</h1>
        {subtitle ? <p className="mt-1 text-xs text-text-2">{subtitle}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </header>
  )
}
