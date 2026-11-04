import type { SelectHTMLAttributes } from 'react'

import { cn } from '@/helpers/utils'
import type { SelectOption } from '@/types/ui'

type DropdownProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[]
}

export function Dropdown({ options, className, ...props }: DropdownProps) {
  return (
    <select
      className={cn(
        'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        className,
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
