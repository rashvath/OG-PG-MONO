import type { InputHTMLAttributes, ReactNode, Ref } from 'react'
import { useId } from 'react'

import { cn } from '@/helpers/utils'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
  rightElement?: ReactNode
  inputRef?: Ref<HTMLInputElement>
}

export function Input({ className, label, hint, error, rightElement, inputRef, id, ...props }: InputProps) {
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
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          className={cn(
            'h-[var(--space-8)] w-full rounded-xs border border-border bg-surface px-[var(--space-6)] text-sm font-[inherit] text-text placeholder:text-text-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--c-focus)]',
            rightElement && 'pr-12',
            error && 'border-2 border-error',
            className,
          )}
          aria-invalid={Boolean(error) || props['aria-invalid']}
          aria-describedby={describedBy}
          {...props}
        />
        {rightElement}
      </div>
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
