import type { HTMLAttributes } from 'react'

import { cn } from '@/helpers/utils'

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'pending' | 'approved' | 'rejected' | 'in-progress' | 'closed' | 'info' | 'default'
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  'in-progress': 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-100 text-gray-600',
  info: 'bg-blue-100 text-blue-800',
  default: 'bg-gray-100 text-gray-600',
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-lg px-[10px] py-[3px] text-xs font-semibold', variantClasses[variant], className)} {...props} />
  )
}
