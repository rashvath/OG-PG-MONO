import type { SelectHTMLAttributes, ReactNode } from 'react'
import { useId } from 'react'

import { cn } from '@/helpers/utils'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
}

export function Select({ className, label, hint, error, id, children, ...props }: SelectProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = [hint ? `${inputId}-hint` : undefined, error ? `${inputId}-error` : undefined].filter(Boolean).join(' ') || undefined

  return (
    <div className="relative">
      {label ? (
        <label htmlFor={inputId} className="mb-[var(--space-2)] block text-xs font-semibold text-text">
          {label}
          {props.required ? <span className="required-mark"> *</span> : null}
        </label>
      ) : null}
      <select
        id={inputId}
        className={cn(
          'h-[var(--space-8)] w-full appearance-none rounded-xs border border-border bg-surface px-[var(--space-6)] pr-10 text-sm font-[inherit] text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-focus)]',
          error && 'border-2 border-error',
          className,
        )}
        aria-invalid={Boolean(error) || props['aria-invalid']}
        aria-describedby={describedBy}
        {...props}
      >
        {children}
      </select>
      <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="pointer-events-none absolute right-3 top-[calc(50%+10px)] h-4 w-4 -translate-y-1/2 text-text-2">
        <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
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
