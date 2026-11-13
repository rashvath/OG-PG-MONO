import { useEffect, useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'

import { AppDialog } from '@/components/ui/AppDialog'
import {
  createTenantProfileUpdateRequest,
  getTenantProfileUpdateRequests,
  getTenantSelf,
  type TenantProfileUpdateRequest,
  type TenantSelf,
} from '@/api/tenant-api'
import { useToast } from '@/lib/toast'

type ProfileFieldKey = 'name' | 'phone' | 'email' | 'profileAddress' | 'emergencyContactName' | 'emergencyContactPhone'

type ProfileFieldErrors = Partial<Record<ProfileFieldKey, string>> & {
  form?: string
}

type ProfileFieldMeta = {
  key: ProfileFieldKey
  label: string
  placeholder: string
  maxLength: number
  inputType?: 'text' | 'email'
}

const PROFILE_FIELDS: ProfileFieldMeta[] = [
  { key: 'name', label: 'Full Name', placeholder: 'Enter new full name', maxLength: 120 },
  { key: 'phone', label: 'Phone Number', placeholder: 'Enter 10-digit phone number', maxLength: 10 },
  { key: 'email', label: 'Email Address', placeholder: 'Enter new email address', maxLength: 160, inputType: 'email' },
  { key: 'profileAddress', label: 'Current Address', placeholder: 'Enter updated address', maxLength: 500 },
  { key: 'emergencyContactName', label: 'Emergency Contact Name', placeholder: 'Enter emergency contact name', maxLength: 120 },
  {
    key: 'emergencyContactPhone',
    label: 'Emergency Contact Phone',
    placeholder: 'Enter 10-digit emergency contact phone',
    maxLength: 10,
  },
]

function getTenantFieldValue(self: TenantSelf | null, key: ProfileFieldKey) {
  const tenant = self?.tenant
  if (!tenant) {
    return ''
  }

  if (key === 'name') return (tenant.name ?? '').trim()
  if (key === 'phone') return (tenant.phone ?? '').trim()
  if (key === 'email') return (tenant.email ?? '').trim().toLowerCase()
  if (key === 'profileAddress') return (tenant.profileAddress ?? '').trim()
  if (key === 'emergencyContactName') return (tenant.emergencyContactName ?? '').trim()

  return (tenant.emergencyContactPhone ?? '').trim()
}

function normalizeInputValue(key: ProfileFieldKey, value: string) {
  if (key === 'phone' || key === 'emergencyContactPhone') {
    return value.replace(/\D/g, '').slice(0, 10)
  }

  if (key === 'email') {
    return value.trim().toLowerCase()
  }

  return value
}

function getRequestHistoryDetails(item: TenantProfileUpdateRequest) {
  const requestedFields = item.requestedFields?.length
    ? item.requestedFields
    : [
        item.requestedName ? 'name' : '',
        item.requestedPhone ? 'phone' : '',
        item.requestedEmail ? 'email' : '',
        item.requestedAddress ? 'profileAddress' : '',
        item.requestedEmergencyContact ? 'emergencyContactName' : '',
        item.requestedEmergencyPhone ? 'emergencyContactPhone' : '',
      ].filter(Boolean)

  const currentValues = {
    name: item.currentValues?.name ?? '-',
    phone: item.currentValues?.phone ?? '-',
    email: item.currentValues?.email ?? '-',
    profileAddress: item.currentValues?.profileAddress ?? '-',
    emergencyContactName: item.currentValues?.emergencyContactName ?? '-',
    emergencyContactPhone: item.currentValues?.emergencyContactPhone ?? '-',
  }

  const proposedValues = {
    name: item.proposedValues?.name ?? item.requestedName ?? '-',
    phone: item.proposedValues?.phone ?? item.requestedPhone ?? '-',
    email: item.proposedValues?.email ?? item.requestedEmail ?? '-',
    profileAddress: item.proposedValues?.profileAddress ?? item.requestedAddress ?? '-',
    emergencyContactName: item.proposedValues?.emergencyContactName ?? item.requestedEmergencyContact ?? '-',
    emergencyContactPhone: item.proposedValues?.emergencyContactPhone ?? item.requestedEmergencyPhone ?? '-',
  }

  return {
    requestedFields: requestedFields as ProfileFieldKey[],
    currentValues,
    proposedValues,
  }
}

export function TenantProfileRequestsPage() {
  const toast = useToast()
  const [self, setSelf] = useState<TenantSelf | null>(null)
  const [items, setItems] = useState<TenantProfileUpdateRequest[]>([])
  const [selectedFields, setSelectedFields] = useState<Record<ProfileFieldKey, boolean>>({
    name: false,
    phone: false,
    email: false,
    profileAddress: false,
    emergencyContactName: false,
    emergencyContactPhone: false,
  })
  const [proposedValues, setProposedValues] = useState<Record<ProfileFieldKey, string>>({
    name: '',
    phone: '',
    email: '',
    profileAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  })
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<ProfileFieldErrors>({})
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const selectedFieldCount = useMemo(
    () => PROFILE_FIELDS.filter((field) => selectedFields[field.key]).length,
    [selectedFields],
  )

  const loadData = async () => {
    setLoading(true)
    try {
      const [selfData, requestsData] = await Promise.all([getTenantSelf(), getTenantProfileUpdateRequests()])
      setSelf(selfData)
      setItems(requestsData.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load tenant profile requests')
    } finally {
      setLoading(false)
    }
  }

  const loadItems = async () => {
    try {
      const requestsData = await getTenantProfileUpdateRequests()
      setItems(requestsData.items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to refresh profile requests')
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const resetForm = () => {
    setSelectedFields({
      name: false,
      phone: false,
      email: false,
      profileAddress: false,
      emergencyContactName: false,
      emergencyContactPhone: false,
    })
    setProposedValues({
      name: '',
      phone: '',
      email: '',
      profileAddress: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    })
    setNotes('')
    setErrors({})
  }

  const openDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    if (submitting) {
      return
    }
    setIsDialogOpen(false)
    setErrors({})
  }

  const onToggleField = (fieldKey: ProfileFieldKey, checked: boolean) => {
    setSelectedFields((current) => ({ ...current, [fieldKey]: checked }))

    if (!checked) {
      setErrors((current) => ({ ...current, [fieldKey]: undefined, form: undefined }))
      return
    }

    const currentValue = getTenantFieldValue(self, fieldKey)
    setProposedValues((current) => ({
      ...current,
      [fieldKey]: current[fieldKey] || currentValue,
    }))
    setErrors((current) => ({ ...current, form: undefined }))
  }

  const validate = () => {
    const nextErrors: ProfileFieldErrors = {}

    if (selectedFieldCount === 0) {
      nextErrors.form = 'Select at least one profile field to request an update.'
    }

    for (const field of PROFILE_FIELDS) {
      if (!selectedFields[field.key]) {
        continue
      }

      const currentValue = getTenantFieldValue(self, field.key)
      const proposedValue = proposedValues[field.key].trim()

      if (!proposedValue) {
        nextErrors[field.key] = `${field.label} is required.`
        continue
      }

      if ((field.key === 'phone' || field.key === 'emergencyContactPhone') && !/^\d{10}$/.test(proposedValue)) {
        nextErrors[field.key] = 'Phone must be exactly 10 digits.'
        continue
      }

      if (field.key === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(proposedValue.toLowerCase())) {
          nextErrors[field.key] = 'Email format is invalid.'
          continue
        }
      }

      const normalizedCurrent = field.key === 'email' ? currentValue.toLowerCase() : currentValue
      const normalizedProposed = field.key === 'email' ? proposedValue.toLowerCase() : proposedValue
      if (normalizedCurrent === normalizedProposed) {
        nextErrors[field.key] = 'New value must be different from current value.'
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const onSubmit = async () => {
    if (!validate()) {
      return
    }

    const changes: Partial<Record<ProfileFieldKey, string>> = {}

    for (const field of PROFILE_FIELDS) {
      if (!selectedFields[field.key]) {
        continue
      }
      changes[field.key] = proposedValues[field.key].trim()
    }

    setSubmitting(true)
    try {
      await createTenantProfileUpdateRequest({
        changes,
        notes: notes.trim() || undefined,
      })
      setIsDialogOpen(false)
      resetForm()
      toast.success('Profile update request submitted')
      await loadItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit profile update request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="tenant-page-shell">
      <article className="panel tenant-page-header">
        <h2 className="tenant-page-title">Profile Update Requests</h2>
        <p className="tenant-page-description">
          Request changes to your existing profile details. Updates are applied only after owner/admin approval.
        </p>
        <div className="tenant-page-actions">
          <button type="button" className="btn btn-brand" onClick={openDialog}>
            New Profile Request
          </button>
        </div>
      </article>

      <article className="panel tenant-history-card">
        <h3 className="tenant-history-title">Request History</h3>

        {loading ? (
          <p className="section-sub">Loading profile requests...</p>
        ) : items.length === 0 ? (
          <div className="tenant-empty-state">
            <span className="tenant-empty-icon" aria-hidden="true">
              <ClipboardList size={18} />
            </span>
            <p className="tenant-empty-title">No profile requests yet</p>
            <p className="tenant-empty-description">Create a request to update your saved profile information.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="tenant-table">
              <thead>
                <tr>
                  <th>Requested Fields</th>
                  <th>Current Values</th>
                  <th>Proposed Values</th>
                  <th>Status</th>
                  <th>Submitted Date</th>
                  <th>Admin Remarks</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const detail = getRequestHistoryDetails(item)
                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="tenant-history-lines">
                          {detail.requestedFields.length
                            ? detail.requestedFields.map((fieldKey) => {
                                const meta = PROFILE_FIELDS.find((field) => field.key === fieldKey)
                                return <span key={`${item._id}-field-${fieldKey}`}>{meta?.label ?? fieldKey}</span>
                              })
                            : '-'}
                        </div>
                      </td>
                      <td>
                        <div className="tenant-history-lines">
                          {detail.requestedFields.length
                            ? detail.requestedFields.map((fieldKey) => {
                                const meta = PROFILE_FIELDS.find((field) => field.key === fieldKey)
                                return (
                                  <span key={`${item._id}-current-${fieldKey}`}>
                                    {meta?.label ?? fieldKey}: {detail.currentValues[fieldKey] || '-'}
                                  </span>
                                )
                              })
                            : '-'}
                        </div>
                      </td>
                      <td>
                        <div className="tenant-history-lines">
                          {detail.requestedFields.length
                            ? detail.requestedFields.map((fieldKey) => {
                                const meta = PROFILE_FIELDS.find((field) => field.key === fieldKey)
                                return (
                                  <span key={`${item._id}-proposed-${fieldKey}`}>
                                    {meta?.label ?? fieldKey}: {detail.proposedValues[fieldKey] || '-'}
                                  </span>
                                )
                              })
                            : '-'}
                        </div>
                      </td>
                      <td>{item.status}</td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>{item.rejectionReason?.trim() || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </article>

      <AppDialog
        open={isDialogOpen}
        title="Profile Update Request"
        subtitle="Select profile fields to update. Your current values are shown for reference."
        onClose={closeDialog}
        footer={(
          <>
            <button type="button" className="btn btn-line" onClick={closeDialog} disabled={submitting}>
              Cancel
            </button>
            <button type="button" className="btn btn-brand" onClick={() => void onSubmit()} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </>
        )}
      >
        <div className="tenant-form-card">
          <p className="section-sub">Current profile details are read-only. Enter new values only for selected fields.</p>

          {PROFILE_FIELDS.map((field) => {
            const currentValue = getTenantFieldValue(self, field.key)
            const isSelected = selectedFields[field.key]
            return (
              <div key={field.key} className="tenant-profile-field-row">
                <label className="tenant-profile-select-label">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(event) => onToggleField(field.key, event.target.checked)}
                  />
                  <span>{field.label}</span>
                </label>

                {isSelected ? (
                  <div className="tenant-profile-field-grid">
                    <div>
                      <label>Current Value</label>
                      <input value={currentValue || '-'} disabled readOnly />
                    </div>
                    <div>
                      <label>New Value</label>
                      <input
                        type={field.inputType ?? 'text'}
                        value={proposedValues[field.key]}
                        placeholder={field.placeholder}
                        maxLength={field.maxLength}
                        onChange={(event) => {
                          const nextValue = normalizeInputValue(field.key, event.target.value)
                          setProposedValues((current) => ({ ...current, [field.key]: nextValue }))
                          if (errors[field.key]) {
                            setErrors((current) => ({ ...current, [field.key]: undefined }))
                          }
                        }}
                      />
                      {errors[field.key] ? <p className="form-error">{errors[field.key]}</p> : null}
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}

          <label>Reason / Additional Notes</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Explain why these profile updates are needed"
          />

          {errors.form ? <p className="form-error">{errors.form}</p> : null}
        </div>
      </AppDialog>
    </section>
  )
}
