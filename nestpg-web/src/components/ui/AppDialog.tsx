import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type AppDialogProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  className?: string
}

export function AppDialog({ open, title, subtitle, onClose, children, footer, wide = false, className }: AppDialogProps) {
  useEffect(() => {
    if (!open) {
      return
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onEscape)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  return createPortal(
    <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className={`app-dialog${wide ? ' app-dialog-wide' : ''}${className ? ` ${className}` : ''}`} onClick={(event) => event.stopPropagation()}>
        <div className="app-dialog-head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="dialog-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {children}

        {footer ? <div className="pg-form-actions">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}
