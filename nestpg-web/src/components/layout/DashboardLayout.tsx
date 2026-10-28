import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'

import { SideMenu } from './SideMenu'

interface DashboardLayoutProps {
  title: string
  links: Array<{ label: string; to: string }>
}

export function DashboardLayout({ title, links }: DashboardLayoutProps) {
  useEffect(() => {
    document.body.classList.add('dashboard-lock-scroll')
    return () => {
      document.body.classList.remove('dashboard-lock-scroll')
    }
  }, [])

  return (
    <div className="dashboard-shell">
      <SideMenu title={title} links={links} />
      <section className="dashboard-content">
        <div className="dashboard-content-inner">
          <Outlet />
        </div>
      </section>
    </div>
  )
}
