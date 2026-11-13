import { useEffect, useState } from 'react'

import { getTenantReviewComplaints, reviewTenantComplaint } from '@/api/tenant-api'
import { useToast } from '@/lib/toast'

type ReviewComplaint = {
  _id: string
  title?: string
  status?: string
  tenantUserId?: { name?: string; email?: string }
  pgId?: { name?: string; area?: string }
}

export function TenantReviewComplaintsPage() {
  const toast = useToast()
  const [items, setItems] = useState<ReviewComplaint[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await getTenantReviewComplaints()
      setItems(data.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load complaints')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const onAction = async (id: string, status: 'in_progress' | 'resolved' | 'rejected') => {
    setWorkingId(id)
    try {
      await reviewTenantComplaint(id, { status })
      toast.success('Complaint status updated')
      await loadItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update complaint')
    } finally {
      setWorkingId('')
    }
  }

  return (
    <section className="tenant-section-stack">
      <article className="panel">
        <h2>Tenant Complaints</h2>
        <div className="table-wrap spaced-top">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>PG</th>
                <th>Title</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>Loading complaints...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5}>No complaints</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id}>
                    <td>{item.tenantUserId?.name || '-'}</td>
                    <td>{item.pgId?.name || '-'}</td>
                    <td>{item.title || '-'}</td>
                    <td>{item.status || '-'}</td>
                    <td>
                      <div className="tenant-inline-actions">
                        <button
                          type="button"
                          className="btn btn-line"
                          disabled={workingId === item._id}
                          onClick={() => void onAction(item._id, 'in_progress')}
                        >
                          In Progress
                        </button>
                        <button
                          type="button"
                          className="btn btn-brand"
                          disabled={workingId === item._id}
                          onClick={() => void onAction(item._id, 'resolved')}
                        >
                          Resolve
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
