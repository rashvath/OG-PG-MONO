import { useEffect, useState } from 'react'

import { AppDialog } from '@/components/ui/AppDialog'
import { createTenantComplaint, getTenantComplaints, type TenantComplaint } from '@/api/tenant-api'
import { useFormConfig } from '@/hooks/use-form-config'
import { useToast } from '@/lib/toast'

export function TenantComplaintsPage() {
  const toast = useToast()
  const complaintConfig = useFormConfig('tenant.complaint')
  const [items, setItems] = useState<TenantComplaint[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await getTenantComplaints()
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

  const validate = () => {
    const nextErrors: { title?: string; description?: string } = {}
    if (complaintConfig.isRequired('title') && title.trim().length < 3) {
      nextErrors.title = 'Title must be at least 3 characters.'
    }
    if (complaintConfig.isRequired('description') && description.trim().length < 5) {
      nextErrors.description = 'Description must be at least 5 characters.'
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
      await createTenantComplaint({ title: title.trim(), description: description.trim() })
      setTitle('')
      setDescription('')
      setErrors({})
      setIsDialogOpen(false)
      toast.success('Complaint submitted')
      await loadItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit complaint')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="tenant-section-stack">
      <article className="panel">
        <h2>Raise Complaint</h2>
        <p className="section-sub spaced-top">Create and track your complaint requests.</p>
        <button type="button" className="btn btn-brand spaced-top" onClick={() => setIsDialogOpen(true)}>
          New complaint
        </button>
      </article>

      <article className="panel">
        <h3>Complaint History</h3>
        <div className="table-wrap spaced-top">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3}>Loading complaints...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={3}>No complaints yet</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id}>
                    <td>{item.title}</td>
                    <td>{item.status}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      <AppDialog
        open={isDialogOpen}
        title="Raise Complaint"
        subtitle="Submit complaint details for owner/admin review."
        onClose={closeDialog}
        footer={(
          <>
            <button type="button" className="btn btn-line" onClick={closeDialog} disabled={submitting}>Cancel</button>
            <button type="button" className="btn btn-brand" onClick={() => void onSubmit()} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit complaint'}
            </button>
          </>
        )}
      >
        <div className="tenant-form-card">
          <label>
            {complaintConfig.getLabel('title', 'Title')}
            {complaintConfig.isRequired('title') ? ' *' : ''}
          </label>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              if (errors.title) setErrors((current) => ({ ...current, title: undefined }))
            }}
            maxLength={120}
            placeholder="Water issue"
          />
          {errors.title ? <p className="form-error">{errors.title}</p> : null}

          <label>
            {complaintConfig.getLabel('description', 'Description')}
            {complaintConfig.isRequired('description') ? ' *' : ''}
          </label>
          <textarea
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
              if (errors.description) setErrors((current) => ({ ...current, description: undefined }))
            }}
            rows={4}
            maxLength={1000}
          />
          {errors.description ? <p className="form-error">{errors.description}</p> : null}
        </div>
      </AppDialog>
    </section>
  )
}
