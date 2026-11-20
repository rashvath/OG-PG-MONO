import { Children, isValidElement, useId } from 'react'
import type { ChangeEvent, ReactElement, ReactNode, SelectHTMLAttributes } from 'react'

import { cn } from '@/helpers/utils'
import { CustomDropdown } from '@/components/ui/CustomDropdown'

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: ReactNode
  hint?: ReactNode
  error?: ReactNode
}

export function Select({ className, label, hint, error, id, children, ...props }: SelectProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const describedBy = [hint ? `${inputId}-hint` : undefined, error ? `${inputId}-error` : undefined].filter(Boolean).join(' ') || undefined

  const options = Children.toArray(children)
    .filter((child) => isValidElement(child) && child.type === 'option')
    .map((child) => {
      const element = child as ReactElement<{ value?: string; children?: ReactNode }>
      return {
        label: String(element.props.children ?? ''),
        value: String(element.props.value ?? ''),
      }
    })

  const selectedValue = String(props.value ?? '')

  return (
    <div className="relative">
      {label ? (
        <label htmlFor={inputId} className="mb-[var(--space-2)] block text-xs font-semibold text-text">
          {label}
          {props.required ? <span className="required-mark"> *</span> : null}
        </label>
      ) : null}
      <CustomDropdown
        ariaLabel={typeof label === 'string' ? label : 'Select option'}
        value={selectedValue}
        onChange={(nextValue) => {
          const syntheticEvent = {
            target: { value: nextValue },
            currentTarget: { value: nextValue },
          } as ChangeEvent<HTMLSelectElement>
          props.onChange?.(syntheticEvent)
        }}
        options={options}
        searchable
        minSearchOptions={8}
        className={cn('select-dropdown', className, error ? 'select-dropdown-error' : '')}
      />
      <input type="hidden" id={inputId} name={props.name} value={selectedValue} aria-describedby={describedBy} />
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
