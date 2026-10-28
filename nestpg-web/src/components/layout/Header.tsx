import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Menu, Search, X } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { useAuth } from '@/lib/auth'

export function Header() {
  const { role, logout } = useAuth()
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [location.pathname])

  const primaryNavItems = useMemo(() => {
    const items: Array<{ to: string; label: string }> = [
      { to: '/listings', label: 'Find a PG' },
      { to: '/register', label: 'List your PG' },
      { to: '/about', label: 'About' },
    ]

    if (role === 'owner') {
      items.push({ to: '/owner', label: 'Owner' })
    } else if (role === 'admin') {
      items.push({ to: '/admin', label: 'Admin' })
    }

    return items
  }, [role])

  const ctaTarget = role === 'owner' ? '/owner/add' : '/register'

  return (
    <header className="site-header">
      <div className="app-wrap nav-row">
        <Link className="logo" to="/" aria-label="Go to OG Stays homepage">
          <span className="logo-mark" aria-hidden="true" />
          <span className="logo-static">OG</span>
          <span className="logo-accent">Stays</span>
        </Link>

        <nav className="main-nav" aria-label="Primary navigation">
          {primaryNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `main-nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions" aria-label="Header actions">
          <Link className="icon-link" to="/listings" aria-label="Search PG listings">
            <Search size={20} aria-hidden="true" />
          </Link>

          {role ? (
            <button type="button" className="nav-link-button" onClick={logout}>
              Log out
            </button>
          ) : (
            <NavLink to="/login" className="main-nav-link action-link">
              Log in
            </NavLink>
          )}

          <NavLink to={ctaTarget} className="btn btn-brand header-cta">
            <span>List your PG</span>
            <ArrowRight size={18} aria-hidden="true" />
          </NavLink>

          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
          >
            {isMobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      <div id="mobile-nav-drawer" className={`mobile-nav-drawer${isMobileMenuOpen ? ' open' : ''}`}>
        <nav className="mobile-nav-links" aria-label="Mobile navigation">
          {primaryNavItems.map((item) => (
            <NavLink
              key={`mobile-${item.to}`}
              to={item.to}
              className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}

          <Link className="mobile-nav-link" to="/listings" aria-label="Search PG listings">
            Search
          </Link>

          {role ? (
            <button type="button" className="mobile-nav-link mobile-nav-logout" onClick={logout}>
              Log out
            </button>
          ) : (
            <NavLink to="/login" className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}>
              Log in
            </NavLink>
          )}

          <NavLink to={ctaTarget} className="btn btn-brand mobile-cta">
            <span>List your PG</span>
            <ArrowRight size={18} aria-hidden="true" />
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
