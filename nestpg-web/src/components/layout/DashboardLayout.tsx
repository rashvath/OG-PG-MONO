import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { SideMenu } from './SideMenu'

interface DashboardLayoutProps {
  title: string
  links: Array<{ label: string; to: string }>
}

export function DashboardLayout({ title, links }: DashboardLayoutProps) {
  const location = useLocation()

  useEffect(() => {
    const isOwnerDashboard = location.pathname.startsWith('/owner')

    if (isOwnerDashboard) {
      document.body.classList.add('dashboard-lock-scroll')
    } else {
      document.body.classList.remove('dashboard-lock-scroll')
    }

    return () => {
      document.body.classList.remove('dashboard-lock-scroll')
    }
  }, [location.pathname])

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
