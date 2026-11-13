import type { ReactNode } from 'react'

type AppDialogProps = {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function AppDialog({ open, title, subtitle, onClose, children, footer, wide = false }: AppDialogProps) {
  if (!open) {
    return null
  }

  return (
    <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`app-dialog${wide ? ' app-dialog-wide' : ''}`}>
        <div className="app-dialog-head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="dialog-close-btn" onClick={onClose} aria-label="Close dialog">
            x
          </button>
        </div>

        {children}

        {footer ? <div className="pg-form-actions">{footer}</div> : null}
      </div>
    </div>
  )
}
