import { useEffect, useState } from 'react'
import { CalendarClock } from 'lucide-react'

import { AppDialog } from '@/components/ui/AppDialog'
import { createTenantAbsenceRequest, getTenantAbsenceRequests, type TenantAbsenceRequest } from '@/api/tenant-api'
import { useFormConfig } from '@/hooks/use-form-config'
import { useToast } from '@/lib/toast'

export function TenantAbsencesPage() {
  const toast = useToast()
  const absenceConfig = useFormConfig('tenant.absence')
  const [items, setItems] = useState<TenantAbsenceRequest[]>([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<{ fromDate?: string; toDate?: string; reason?: string }>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await getTenantAbsenceRequests()
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

  const validate = () => {
    const nextErrors: { fromDate?: string; toDate?: string; reason?: string } = {}
    if (absenceConfig.isRequired('fromDate') && !fromDate) {
      nextErrors.fromDate = 'From date is required.'
    }
    if (absenceConfig.isRequired('toDate') && !toDate) {
      nextErrors.toDate = 'To date is required.'
    }
    if (fromDate && toDate && new Date(toDate) < new Date(fromDate)) {
      nextErrors.toDate = 'To date must be on or after from date.'
    }
    if (absenceConfig.isRequired('reason') && reason.trim().length < 3) {
      nextErrors.reason = 'Reason must be at least 3 characters.'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const closeDialog = () => {
    if (submitting) {
      return
    }
    setIsDialogOpen(false)
    setErrors({})
  }

  const onSubmit = async () => {
    if (!validate()) {
      return
    }

    setSubmitting(true)
    try {
      await createTenantAbsenceRequest({
        fromDate,
        toDate,
        reason: reason.trim(),
      })
      setFromDate('')
      setToDate('')
      setReason('')
      setErrors({})
      setIsDialogOpen(false)
      toast.success('Absence request submitted')
      await loadItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit absence request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="tenant-page-shell">
      <article className="panel tenant-page-header">
        <h2 className="tenant-page-title">Absences</h2>
        <p className="tenant-page-description">Submit your planned away dates for approval tracking.</p>
        <div className="tenant-page-actions">
          <button type="button" className="btn btn-brand" onClick={() => setIsDialogOpen(true)}>
            New Absence Request
          </button>
        </div>
      </article>

      <article className="panel tenant-history-card">
        <h3 className="tenant-history-title">Absence Request History</h3>

        {loading ? (
          <p className="section-sub">Loading absence requests...</p>
        ) : items.length === 0 ? (
          <div className="tenant-empty-state">
            <span className="tenant-empty-icon" aria-hidden="true">
              <CalendarClock size={18} />
            </span>
            <p className="tenant-empty-title">No absence requests yet</p>
            <p className="tenant-empty-description">
              Create an absence request to keep your owner/admin informed about planned away dates.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tenant-table">
              <thead>
                <tr>
                  <th>From</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>{new Date(item.fromDate).toLocaleDateString()}</td>
                    <td>{new Date(item.toDate).toLocaleDateString()}</td>
                    <td>{item.status}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td>-</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <AppDialog
        open={isDialogOpen}
        title="Mark Absence"
        subtitle="Share the period and reason for your absence."
        onClose={closeDialog}
        footer={(
          <>
            <button type="button" className="btn btn-line" onClick={closeDialog} disabled={submitting}>Cancel</button>
            <button type="button" className="btn btn-brand" onClick={() => void onSubmit()} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit absence request'}
            </button>
          </>
        )}
      >
        <div className="tenant-form-card">
          <label>
            {absenceConfig.getLabel('fromDate', 'From date')}
            {absenceConfig.isRequired('fromDate') ? ' *' : ''}
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => {
              setFromDate(event.target.value)
              if (errors.fromDate) setErrors((current) => ({ ...current, fromDate: undefined }))
            }}
          />
          {errors.fromDate ? <p className="form-error">{errors.fromDate}</p> : null}

          <label>
            {absenceConfig.getLabel('toDate', 'To date')}
            {absenceConfig.isRequired('toDate') ? ' *' : ''}
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(event) => {
              setToDate(event.target.value)
              if (errors.toDate) setErrors((current) => ({ ...current, toDate: undefined }))
            }}
          />
          {errors.toDate ? <p className="form-error">{errors.toDate}</p> : null}

          <label>
            {absenceConfig.getLabel('reason', 'Reason')}
            {absenceConfig.isRequired('reason') ? ' *' : ''}
          </label>
          <textarea
            value={reason}
            onChange={(event) => {
              setReason(event.target.value)
              if (errors.reason) setErrors((current) => ({ ...current, reason: undefined }))
            }}
            rows={4}
            maxLength={500}
            placeholder="Explain your absence"
          />
          {errors.reason ? <p className="form-error">{errors.reason}</p> : null}
        </div>
      </AppDialog>
    </section>
  )
}
