import type { HTMLAttributes } from 'react'

import { cn } from '@/helpers/utils'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'pending' | 'approved' | 'rejected' | 'in-progress' | 'closed' | 'info' | 'default'
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  pending: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  approved: 'bg-[var(--success-bg)] text-[var(--success)]',
  rejected: 'bg-[var(--danger-bg)] text-[var(--danger)]',
  'in-progress': 'bg-[var(--info-bg)] text-[var(--info)]',
  closed: 'bg-[var(--brand-sky)] text-[var(--muted)]',
  info: 'bg-[var(--info-bg)] text-[var(--info)]',
  default: 'bg-[var(--brand-sky)] text-[var(--brand-navy)]',
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-lg px-[10px] py-[3px] text-xs font-semibold', variantClasses[variant], className)} {...props} />
  )
}
