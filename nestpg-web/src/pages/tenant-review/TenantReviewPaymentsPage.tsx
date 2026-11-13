import { useEffect, useState } from 'react'

import { getTenantReviewPaymentProofs, reviewTenantPaymentProof } from '@/api/tenant-api'
import { useToast } from '@/lib/toast'

type ReviewPayment = {
  _id: string
  amount?: number
  paidForMonth?: string
  status?: string
  screenshotUrl?: string
  tenantUserId?: { name?: string; email?: string }
  pgId?: { name?: string; area?: string }
}

export function TenantReviewPaymentsPage() {
  const toast = useToast()
  const [items, setItems] = useState<ReviewPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await getTenantReviewPaymentProofs()
      setItems(data.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load payment proofs')
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
      await reviewTenantPaymentProof(id, { status })
      toast.success('Payment proof updated')
      await loadItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update payment proof')
    } finally {
      setWorkingId('')
    }
  }

  return (
    <section className="tenant-section-stack">
      <article className="panel">
        <h2>Tenant Payment Proofs</h2>
        <div className="table-wrap spaced-top">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>PG</th>
                <th>Amount</th>
                <th>Month</th>
                <th>Status</th>
                <th>Proof</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7}>Loading payment proofs...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7}>No payment proofs</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id}>
                    <td>{item.tenantUserId?.name || '-'}</td>
                    <td>{item.pgId?.name || '-'}</td>
                    <td>{item.amount ?? '-'}</td>
                    <td>{item.paidForMonth || '-'}</td>
                    <td>{item.status || '-'}</td>
                    <td>
                      {item.screenshotUrl ? (
                        <a href={item.screenshotUrl} target="_blank" rel="noreferrer">
                          View proof
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
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
