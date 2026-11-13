import type { HTMLAttributes } from 'react'

import { cn } from '@/helpers/utils'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: 'sm' | 'md' | 'lg'
}

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  sm: 'p-3',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({ className, padding = 'md', ...props }: CardProps) {
  return <div className={cn('rounded-sm border border-border bg-surface shadow-1', paddingClasses[padding], className)} {...props} />
}
