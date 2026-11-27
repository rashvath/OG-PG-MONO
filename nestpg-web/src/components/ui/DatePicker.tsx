import type { InputHTMLAttributes } from 'react'

import { cn } from '@/helpers/utils'

type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function DatePicker({ className, ...props }: DatePickerProps) {
  return (
    <input
      type="date"
      className={cn(
        'w-full rounded-[var(--radius-control)] border border-[var(--field-border)] bg-[var(--brand-white)] px-3 py-2 text-sm text-[var(--brand-ink)] shadow-sm focus:border-[var(--brand-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-action)]',
        className,
      )}
      {...props}
    />
  )
}
