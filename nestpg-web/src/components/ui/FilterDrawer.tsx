import { type ReactNode, useEffect } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'

type FilterDrawerProps = {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  buttonLabel?: string
  drawerId?: string
  applyLabel?: string
  clearLabel?: string
  disableApply?: boolean
  disableClear?: boolean
  closeOnApply?: boolean
  onApply?: () => void
  onClear?: () => void
  children: ReactNode
}

export function FilterDrawer({
  isOpen,
  onOpenChange,
  title = 'Filter by',
  buttonLabel = 'Filters',
  drawerId = 'app-filter-drawer',
  applyLabel = 'Apply filters',
  clearLabel = 'Clear all',
  disableApply,
  disableClear,
  closeOnApply = true,
  onApply,
  onClear,
  children,
}: FilterDrawerProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onEscape)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onEscape)
    }
  }, [isOpen, onOpenChange])

  return (
    <>
      <button
        type="button"
        className="btn btn-line app-filter-trigger"
        aria-expanded={isOpen}
        aria-controls={drawerId}
        onClick={() => onOpenChange(true)}
      >
        <SlidersHorizontal size={15} />
        <span>{buttonLabel}</span>
      </button>

      {isOpen ? (
        <div className="app-filter-drawer-backdrop" onClick={() => onOpenChange(false)}>
          <aside
            id={drawerId}
            className="app-filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="app-filter-drawer-head">
              <h3>{title}</h3>
              <button
                type="button"
                className="dialog-close-btn"
                aria-label="Close filters"
                onClick={() => onOpenChange(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="app-filter-drawer-body">{children}</div>

            <div className="app-filter-drawer-foot">
              <button type="button" className="btn btn-line" onClick={onClear} disabled={disableClear}>
                {clearLabel}
              </button>
              <button
                type="button"
                className="btn btn-brand"
                disabled={disableApply}
                onClick={() => {
                  onApply?.()
                  if (closeOnApply) {
                    onOpenChange(false)
                  }
                }}
              >
                <Search size={15} />
                <span>{applyLabel}</span>
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  )
}
