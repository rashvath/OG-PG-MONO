import { useEffect, useState } from 'react'

import { getTenantPendingApprovals, reviewTenantApproval } from '@/api/tenant-api'
import { useToast } from '@/lib/toast'

type ApprovalItem = {
  _id: string
  name: string
  email: string
  phone: string
  tenantPgId?: { _id?: string; name?: string; area?: string } | string
}

export function TenantReviewApprovalsPage() {
  const toast = useToast()
  const [items, setItems] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await getTenantPendingApprovals()
      setItems(data.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load tenant approvals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const onAction = async (tenantUserId: string, action: 'approve' | 'reject') => {
    setWorkingId(tenantUserId)
    try {
      await reviewTenantApproval(tenantUserId, { action })
      toast.success(action === 'approve' ? 'Tenant approved' : 'Tenant rejected')
      await loadItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to review tenant')
    } finally {
      setWorkingId('')
    }
  }

  return (
    <section className="tenant-section-stack">
      <article className="panel">
        <h2>Tenant Registration Approvals</h2>
        <div className="table-wrap spaced-top">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>PG</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5}>Loading approvals...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5}>No pending tenant approvals</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>{item.phone}</td>
                    <td>{typeof item.tenantPgId === 'object' ? item.tenantPgId?.name || '-' : '-'}</td>
                    <td>
                      <div className="tenant-inline-actions">
                        <button
                          type="button"
                          className="btn btn-brand"
                          disabled={workingId === item._id}
                          onClick={() => void onAction(item._id, 'approve')}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-line"
                          disabled={workingId === item._id}
                          onClick={() => void onAction(item._id, 'reject')}
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
