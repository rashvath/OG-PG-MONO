import { useEffect, useState } from 'react'

import { getTenantSelf, type TenantSelf } from '@/api/tenant-api'
import { useToast } from '@/lib/toast'

export function TenantOverviewPage() {
  const toast = useToast()
  const [self, setSelf] = useState<TenantSelf | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSelf() {
      setLoading(true)
      try {
        const data = await getTenantSelf()
        setSelf(data)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load tenant overview')
      } finally {
        setLoading(false)
      }
    }

    void loadSelf()
  }, [toast])

  if (loading) {
    return <section className="panel">Loading tenant overview...</section>
  }

  return (
    <section className="tenant-section-stack">
      <article className="panel">
        <h2>Tenant Dashboard</h2>
        <p className="section-sub spaced-top">PG: {self?.pg?.name ?? 'Not assigned'} {self?.pg?.area ? `- ${self.pg.area}` : ''}</p>
        <p className="section-sub spaced-top">Use the side menu to open a dedicated section for complaints, rent payment proofs, absences, and profile requests.</p>
      </article>

      <article className="panel tenant-summary-grid">
        <div className="tenant-summary-item">
          <h3>Account Name</h3>
          <p>{self?.tenant?.name ?? '-'}</p>
        </div>
        <div className="tenant-summary-item">
          <h3>Email</h3>
          <p>{self?.tenant?.email ?? '-'}</p>
        </div>
        <div className="tenant-summary-item">
          <h3>Phone</h3>
          <p>{self?.tenant?.phone ?? '-'}</p>
        </div>
        <div className="tenant-summary-item">
          <h3>Approval Status</h3>
          <p>{self?.tenant?.tenantApprovalStatus ?? '-'}</p>
        </div>
      </article>
    </section>
  )
}
