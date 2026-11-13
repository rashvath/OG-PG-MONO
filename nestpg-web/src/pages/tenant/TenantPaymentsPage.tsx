import { useEffect, useState } from 'react'

import { AppDialog } from '@/components/ui/AppDialog'
import { createTenantPaymentProof, getTenantPaymentProofs, type TenantPaymentProof } from '@/api/tenant-api'
import { uploadPgImages } from '@/api/upload-api'
import { useToast } from '@/lib/toast'

export function TenantPaymentsPage() {
  const toast = useToast()
  const [items, setItems] = useState<TenantPaymentProof[]>([])
  const [amount, setAmount] = useState('')
  const [paidForMonth, setPaidForMonth] = useState('')
  const [transactionRef, setTransactionRef] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [uploadedScreenshotUrl, setUploadedScreenshotUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<{ amount?: string; screenshotFile?: string }>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await getTenantPaymentProofs()
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

  const validate = () => {
    const nextErrors: { amount?: string; screenshotFile?: string } = {}
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      nextErrors.amount = 'Amount must be greater than 0.'
    }

    if (!screenshotFile && !uploadedScreenshotUrl) {
      nextErrors.screenshotFile = 'Screenshot image is required.'
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
      let screenshotUrl = uploadedScreenshotUrl
      if (!screenshotUrl && screenshotFile) {
        const urls = await uploadPgImages([screenshotFile])
        screenshotUrl = urls[0] ?? ''
      }

      if (!screenshotUrl) {
        setErrors((current) => ({ ...current, screenshotFile: 'Screenshot upload failed. Please try again.' }))
        setSubmitting(false)
        return
      }

      await createTenantPaymentProof({
        amount: Number(amount),
        paidForMonth: paidForMonth.trim() || undefined,
        transactionRef: transactionRef.trim() || undefined,
        screenshotUrl,
        notes: notes.trim() || undefined,
      })
      setAmount('')
      setPaidForMonth('')
      setTransactionRef('')
      setScreenshotFile(null)
      setUploadedScreenshotUrl('')
      setNotes('')
      setErrors({})
      setIsDialogOpen(false)
      toast.success('Payment proof submitted')
      await loadItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit payment proof')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="tenant-section-stack">
      <article className="panel">
        <h2>Rent Payment Proof</h2>
        <p className="section-sub spaced-top">Upload payment proof details for rent verification.</p>
        <button type="button" className="btn btn-brand spaced-top" onClick={() => setIsDialogOpen(true)}>
          New payment proof
        </button>
      </article>

      <article className="panel">
        <h3>Payment Proof History</h3>
        <div className="table-wrap spaced-top">
          <table>
            <thead>
              <tr>
                <th>Amount</th>
                <th>Month</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4}>Loading payment proofs...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4}>No payment proofs yet</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id}>
                    <td>{item.amount}</td>
                    <td>{item.paidForMonth || '-'}</td>
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
        title="Rent Payment Proof"
        subtitle="Submit your rent payment information and upload screenshot proof."
        onClose={closeDialog}
        footer={(
          <>
            <button type="button" className="btn btn-line" onClick={closeDialog} disabled={submitting}>Cancel</button>
            <button type="button" className="btn btn-brand" onClick={() => void onSubmit()} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit payment proof'}
            </button>
          </>
        )}
      >
        <div className="tenant-form-card">
          <label>Amount *</label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value)
              if (errors.amount) setErrors((current) => ({ ...current, amount: undefined }))
            }}
          />
          {errors.amount ? <p className="form-error">{errors.amount}</p> : null}

          <label>Paid month</label>
          <input value={paidForMonth} onChange={(event) => setPaidForMonth(event.target.value)} maxLength={40} placeholder="Nov 2026" />

          <label>Transaction ref</label>
          <input value={transactionRef} onChange={(event) => setTransactionRef(event.target.value)} maxLength={80} />

          <label>Screenshot Upload *</label>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              setScreenshotFile(file)
              setUploadedScreenshotUrl('')
              if (errors.screenshotFile) setErrors((current) => ({ ...current, screenshotFile: undefined }))
            }}
          />
          {screenshotFile ? <p className="section-sub">Selected: {screenshotFile.name}</p> : null}
          {errors.screenshotFile ? <p className="form-error">{errors.screenshotFile}</p> : null}

          <label>Notes</label>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} maxLength={500} />
        </div>
      </AppDialog>
    </section>
  )
}
