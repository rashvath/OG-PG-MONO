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
  searchable?: boolean
  searchPlaceholder?: string
  emptySearchMessage?: string
  minSearchOptions?: number
}

export function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className,
  ariaLabel,
  searchable = true,
  searchPlaceholder = 'Search options...',
  emptySearchMessage = 'No matches found',
  minSearchOptions = 6,
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const selected = useMemo(() => options.find((option) => option.value === value), [options, value])
  const canSearch = searchable && options.length >= minSearchOptions

  const filteredOptions = useMemo(() => {
    if (!canSearch) {
      return options
    }

    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return options
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalized))
  }, [canSearch, options, query])

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

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }

    if (canSearch) {
      searchInputRef.current?.focus()
    }
  }, [canSearch, open])

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
          {canSearch ? (
            <div className="custom-dropdown-search-wrap" onClick={(event) => event.stopPropagation()}>
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="custom-dropdown-search"
                placeholder={searchPlaceholder}
                aria-label={`${ariaLabel ?? 'dropdown'} search`}
              />
            </div>
          ) : null}

          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
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
            })
          ) : (
            <p className="custom-dropdown-empty">{emptySearchMessage}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
