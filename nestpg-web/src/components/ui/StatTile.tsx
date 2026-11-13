import type { HTMLAttributes, ReactNode } from 'react'

import { Card } from '@/components/ui/Card'
import { cn } from '@/helpers/utils'

type StatTileProps = HTMLAttributes<HTMLDivElement> & {
  icon?: ReactNode
  value: ReactNode
  label: string
  trend?: 'up' | 'down' | null
}

export function StatTile({ icon, value, label, trend, className, onClick, ...props }: StatTileProps) {
  return (
    <Card padding="md" className={cn('relative cursor-pointer hover:shadow-2', onClick ? 'transition-shadow' : '', className)} onClick={onClick} {...props}>
      {icon ? <div className="absolute right-4 top-4 text-text-2">{icon}</div> : null}
      <div className="mt-2 text-md font-bold leading-none text-text">{value}</div>
      <div className="mt-1 text-xs text-text-2">{label}</div>
      {trend ? (
        <span className={cn('mt-3 inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold', trend === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
          {trend === 'up' ? '↑' : '↓'} {trend === 'up' ? 'Up' : 'Down'}
        </span>
      ) : null}
    </Card>
  )
}
