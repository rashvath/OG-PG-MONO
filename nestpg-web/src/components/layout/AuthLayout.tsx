import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import sectionTwoImage from '@/assets/section2.png'

type AuthLayoutProps = {
  children: ReactNode
  compactCard?: boolean
}

export function AuthLayout({ children, compactCard = false }: AuthLayoutProps) {
  return (
    <div className="auth-page-layout">
      <div className="auth-page-split">
        <div className="auth-page-media" aria-hidden="true">
          <img src={sectionTwoImage} alt="" loading="lazy" />
          <div className="auth-page-media-copy">
            <h2>Find better PG stays in Bangalore</h2>
            <p>Trusted listings, cleaner move-ins, smarter tenant-owner workflows.</p>
          </div>
        </div>

        <div className="auth-page-panel">
          <div className="auth-page-inner">
            <Link to="/" className="auth-page-back-home" aria-label="Back to home page">
              {'<- Back to home'}
            </Link>
            <div className={`auth-page-card${compactCard ? ' auth-page-card-compact' : ''}`}>{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
