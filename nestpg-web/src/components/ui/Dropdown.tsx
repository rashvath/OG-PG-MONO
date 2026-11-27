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
        'w-full rounded-[var(--radius-control)] border border-[var(--field-border)] bg-[var(--brand-white)] px-3 py-2 text-sm text-[var(--brand-ink)] shadow-sm focus:border-[var(--brand-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-action)]',
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
