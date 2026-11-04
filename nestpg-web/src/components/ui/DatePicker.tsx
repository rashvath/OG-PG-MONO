import type { InputHTMLAttributes } from 'react'

import { cn } from '@/helpers/utils'

type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function DatePicker({ className, ...props }: DatePickerProps) {
  return (
    <input
      type="date"
      className={cn(
        'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        className,
      )}
      {...props}
    />
  )
}
