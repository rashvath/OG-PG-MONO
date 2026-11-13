import { useEffect, useState } from 'react'

import { getTenantReviewAbsences, reviewTenantAbsence } from '@/api/tenant-api'
import { useToast } from '@/lib/toast'

type ReviewAbsence = {
  _id: string
  fromDate?: string
  toDate?: string
  reason?: string
  status?: string
  tenantUserId?: { name?: string; email?: string }
  pgId?: { name?: string; area?: string }
}

export function TenantReviewAbsencesPage() {
  const toast = useToast()
  const [items, setItems] = useState<ReviewAbsence[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await getTenantReviewAbsences()
      setItems(data.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load absence requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const onAction = async (id: string, status: 'approved' | 'rejected') => {
    setWorkingId(id)
    try {
      await reviewTenantAbsence(id, { status })
      toast.success('Absence request updated')
      await loadItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update absence request')
    } finally {
      setWorkingId('')
    }
  }

  return (
    <section className="tenant-section-stack">
      <article className="panel">
        <h2>Tenant Absence Requests</h2>
        <div className="table-wrap spaced-top">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>PG</th>
                <th>From</th>
                <th>To</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>Loading absence requests...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6}>No absence requests</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id}>
                    <td>{item.tenantUserId?.name || '-'}</td>
                    <td>{item.pgId?.name || '-'}</td>
                    <td>{item.fromDate ? new Date(item.fromDate).toLocaleDateString() : '-'}</td>
                    <td>{item.toDate ? new Date(item.toDate).toLocaleDateString() : '-'}</td>
                    <td>{item.status || '-'}</td>
                    <td>
                      <div className="tenant-inline-actions">
                        <button
                          type="button"
                          className="btn btn-brand"
                          disabled={workingId === item._id}
                          onClick={() => void onAction(item._id, 'approved')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-line"
                          disabled={workingId === item._id}
                          onClick={() => void onAction(item._id, 'rejected')}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
