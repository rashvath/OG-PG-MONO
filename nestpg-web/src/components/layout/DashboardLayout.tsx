import { Outlet } from 'react-router-dom'

import { SideMenu } from './SideMenu'

interface DashboardLayoutProps {
  title: string
  links: Array<{ label: string; to: string }>
}

export function DashboardLayout({ title, links }: DashboardLayoutProps) {
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
