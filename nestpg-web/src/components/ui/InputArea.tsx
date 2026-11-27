import type { TextareaHTMLAttributes } from 'react'

import { cn } from '@/helpers/utils'

type InputAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>

export function InputArea({ className, rows = 4, ...props }: InputAreaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(
        'w-full rounded-[var(--radius-control)] border border-[var(--field-border)] bg-[var(--brand-white)] px-3 py-2 text-sm text-[var(--brand-ink)] shadow-sm focus:border-[var(--brand-action)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-action)]',
        className,
      )}
      {...props}
    />
  )
}
