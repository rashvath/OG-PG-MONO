import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-page-layout">
      <div className="auth-page-inner">
        <div className="auth-page-brand">
          <Link to="/" aria-label="NestPG home">NestPG</Link>
          <p>PG Management Platform</p>
        </div>
        <div className="auth-page-card">{children}</div>
      </div>
    </div>
  )
}
