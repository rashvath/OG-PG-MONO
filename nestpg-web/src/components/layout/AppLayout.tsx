import type { ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { SkipLink } from '@/components/ui/SkipLink'
import { cn } from '@/helpers/utils'

type AppLayoutProps = {
  children: ReactNode
  title?: string
  navItems?: Array<{ to: string; label: string; icon?: ReactNode }>
  userName?: string
  roleLabel?: string
  onSignOut?: () => void
}

export function AppLayout({ children, title = 'NestPG', navItems = [], userName = 'User', roleLabel = 'Member', onSignOut }: AppLayoutProps) {
  return (
    <>
      <SkipLink />
      <div className="flex h-screen overflow-hidden bg-surface">
        <aside className="hidden h-full w-64 flex-col border-r border-border bg-surface md:flex">
          <div className="border-b border-border p-[var(--space-6)]">
            <div className="text-sm font-bold text-accent">NestPG</div>
            <div className="mt-1 text-xs text-text-2">{roleLabel}</div>
          </div>
          <nav aria-label="Primary" className="flex-1 overflow-y-auto py-[var(--space-4)]">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'mx-2 my-[var(--space-1)] flex min-h-control items-center gap-3 rounded-xs px-[var(--space-6)] text-xs text-text-2',
                    isActive && 'border-l-[3px] border-accent bg-muted pl-[calc(var(--space-6)-3px)] font-semibold text-text',
                    !isActive && 'hover:bg-muted hover:text-text',
                  )
                }
                end={item.to === '/'}
              >
                {item.icon ? <span className="inline-flex h-5 w-5 items-center justify-center">{item.icon}</span> : null}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-border p-[var(--space-4)]">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-text">
                {userName.slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-text">{userName}</div>
              </div>
            </div>
            {onSignOut ? (
              <button type="button" className="mt-3 w-full rounded-xs px-0 text-left text-xs text-text-2 hover:underline" onClick={onSignOut}>
                Sign out
              </button>
            ) : null}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-[var(--space-4)] border-b border-border bg-surface/90 px-[var(--space-6)] backdrop-blur-sm md:hidden">
            <button type="button" aria-label="Open menu" className="flex h-12 w-12 items-center justify-center rounded-xs border border-border text-text">
              <Menu className="h-5 w-5" />
            </button>
            <div className="truncate text-sm font-semibold text-text">{title}</div>
          </header>
          <main id="main" className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1120px] px-[var(--space-6)] py-[var(--space-8)]">{children}</div>
          </main>
        </div>
      </div>
    </>
  )
}
