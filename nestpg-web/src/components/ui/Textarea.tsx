import type { TextareaHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

import { cn } from '@/helpers/utils'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
}

export function Textarea({ className, label, hint, error, id, ...props }: TextareaProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = [hint ? `${inputId}-hint` : undefined, error ? `${inputId}-error` : undefined].filter(Boolean).join(' ') || undefined

  return (
    <div>
      {label ? (
        <label htmlFor={inputId} className="mb-[var(--space-2)] block text-xs font-semibold text-text">
          {label}
        </label>
      ) : null}
      <textarea
        id={inputId}
        className={cn(
          'min-h-[96px] w-full resize-y rounded-xs border border-border bg-surface px-[var(--space-6)] py-2 text-sm font-[inherit] text-text placeholder:text-text-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-focus)]',
          error && 'border-2 border-error',
          className,
        )}
        aria-invalid={Boolean(error) || props['aria-invalid']}
        aria-describedby={describedBy}
        {...props}
      />
      {hint ? (
        <p id={`${inputId}-hint`} className="mt-[var(--space-2)] text-xs text-text-2">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className="mt-[var(--space-2)] text-xs font-semibold text-error">
          ⚠ {error}
        </p>
      ) : null}
    </div>
  )
}
