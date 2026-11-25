import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { DashboardLayout } from './DashboardLayout'
import { getManagerAccess, type ManagerAccess, type ManagerModule } from '@/api/manager-api'

const moduleLinks: Array<{ module: ManagerModule; label: string; path: string }> = [
  { module: 'pgs', label: 'PG details', path: 'pgs' },
  { module: 'residents', label: 'Residents', path: 'residents' },
  { module: 'inventory', label: 'Rooms & Beds', path: 'inventory' },
  { module: 'enquiries', label: 'Enquiries', path: 'enquiries' },
  { module: 'finance', label: 'Finance', path: 'finance' },
  { module: 'documents', label: 'Documents', path: 'documents' },
  { module: 'staff', label: 'Staff', path: 'staff' },
  { module: 'tenantReview', label: 'Tenant requests', path: 'tenant-review' },
]

export function ManagerLayout() {
  const [access, setAccess] = useState<ManagerAccess | null>(null)
  const [error, setError] = useState('')
  const location = useLocation()
  useEffect(() => {
    getManagerAccess().then(setAccess).catch(() => setError('Manager access is unavailable. Contact the PG owner.'))
  }, [])
  if (error) return <section className="app-wrap section-pad"><h1>Access unavailable</h1><p>{error}</p></section>
  if (!access) return <section className="app-wrap section-pad" aria-live="polite">Loading manager workspace…</section>
  const links = moduleLinks.filter(({ module }) => access.permissions[module]?.read).map(({ label, path }) => ({ label, to: `/manager/${path}` }))
  const currentPath = location.pathname.replace('/manager/', '')
  const currentModule = moduleLinks.find((link) => currentPath === link.path || currentPath.startsWith(`${link.path}/`))?.module
  if (currentModule && !access.permissions[currentModule]?.read) return <Navigate to={links[0]?.to ?? '/'} replace />
  return <DashboardLayout title={`Manager · ${typeof access.pgId === 'string' ? 'PG' : access.pgId.name}`} links={links} />
}

export function ManagerLanding() {
  return <Navigate to="pgs" replace />
}
