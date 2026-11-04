import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/helpers/utils'

type NavbarItem = {
  label: string
  to: string
}

type NavbarProps = {
  brand: string
  items: NavbarItem[]
  rightSlot?: ReactNode
  className?: string
}

export function Navbar({ brand, items, rightSlot, className }: NavbarProps) {
  return (
    <nav className={cn('flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3', className)}>
      <Link to="/" className="text-base font-semibold text-slate-900">
        {brand}
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        {items.map((item) => (
          <Link key={item.to} to={item.to} className="rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900">
            {item.label}
          </Link>
        ))}
      </div>

      {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
    </nav>
  )
}
