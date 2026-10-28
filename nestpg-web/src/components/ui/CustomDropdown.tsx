import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

type DropdownOption = {
  label: string
  value: string
}

type CustomDropdownProps = {
  options: DropdownOption[]
  value: string
  onChange: (nextValue: string) => void
  placeholder?: string
  className?: string
  ariaLabel?: string
}

export function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className,
  ariaLabel,
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const selected = useMemo(() => options.find((option) => option.value === value), [options, value])

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onEscape)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [])

  return (
    <div ref={rootRef} className={`custom-dropdown ${className ?? ''}`.trim()}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="custom-dropdown-trigger"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} className={`custom-dropdown-arrow ${open ? 'open' : ''}`} />
      </button>

      {open ? (
        <div className="custom-dropdown-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value || '__empty'}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`custom-dropdown-option ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
