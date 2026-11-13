import type { ReactNode } from 'react'

import { cn } from '@/helpers/utils'

type EmptyStateProps = {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}>
      {icon ? <div className="flex h-12 w-12 items-center justify-center text-text-2">{icon}</div> : null}
      <div>
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        {description ? <p className="mt-1 max-w-[40ch] text-xs text-text-2">{description}</p> : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  )
}
