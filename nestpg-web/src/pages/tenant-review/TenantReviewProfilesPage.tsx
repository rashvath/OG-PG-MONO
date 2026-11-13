import { useEffect, useState } from 'react'

import { getTenantReviewProfileUpdates, reviewTenantProfileUpdate } from '@/api/tenant-api'
import { useToast } from '@/lib/toast'

type ProfileFieldKey = 'name' | 'phone' | 'email' | 'profileAddress' | 'emergencyContactName' | 'emergencyContactPhone'

type ReviewProfile = {
  _id: string
  requestedFields?: ProfileFieldKey[]
  currentValues?: Partial<Record<ProfileFieldKey, string>>
  proposedValues?: Partial<Record<ProfileFieldKey, string>>
  requestedName?: string
  requestedPhone?: string
  requestedEmail?: string
  requestedAddress?: string
  requestedEmergencyContact?: string
  requestedEmergencyPhone?: string
  status?: string
  rejectionReason?: string
  tenantUserId?: { name?: string; email?: string }
  pgId?: { name?: string; area?: string }
}

const FIELD_LABELS: Record<ProfileFieldKey, string> = {
  name: 'Full Name',
  phone: 'Phone Number',
  email: 'Email Address',
  profileAddress: 'Current Address',
  emergencyContactName: 'Emergency Contact Name',
  emergencyContactPhone: 'Emergency Contact Phone',
}

function getItemDetails(item: ReviewProfile) {
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

export function TenantReviewProfilesPage() {
  const toast = useToast()
  const [items, setItems] = useState<ReviewProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState('')

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await getTenantReviewProfileUpdates()
      setItems(data.items as ReviewProfile[])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load profile update requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadItems()
  }, [])

  const onAction = async (id: string, action: 'approve' | 'reject') => {
    setWorkingId(id)
    try {
      await reviewTenantProfileUpdate(id, { action })
      toast.success('Profile update request reviewed')
      await loadItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update profile request')
    } finally {
      setWorkingId('')
    }
  }

  return (
    <section className="tenant-section-stack">
      <article className="panel">
        <h2>Tenant Profile Update Requests</h2>
        <div className="table-wrap spaced-top">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>PG</th>
                <th>Requested Fields</th>
                <th>Current Values</th>
                <th>Proposed Values</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>Loading profile update requests...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8}>No profile update requests</td>
                </tr>
              ) : (
                items.map((item) => {
                  const detail = getItemDetails(item)
                  return (
                    <tr key={item._id}>
                      <td>{item.tenantUserId?.name || '-'}</td>
                      <td>{item.pgId?.name || '-'}</td>
                      <td>
                        <div className="tenant-history-lines">
                          {detail.requestedFields.length
                            ? detail.requestedFields.map((field) => <span key={`${item._id}-field-${field}`}>{FIELD_LABELS[field]}</span>)
                            : '-'}
                        </div>
                      </td>
                      <td>
                        <div className="tenant-history-lines">
                          {detail.requestedFields.length
                            ? detail.requestedFields.map((field) => (
                                <span key={`${item._id}-current-${field}`}>
                                  {FIELD_LABELS[field]}: {detail.currentValues[field] || '-'}
                                </span>
                              ))
                            : '-'}
                        </div>
                      </td>
                      <td>
                        <div className="tenant-history-lines">
                          {detail.requestedFields.length
                            ? detail.requestedFields.map((field) => (
                                <span key={`${item._id}-proposed-${field}`}>
                                  {FIELD_LABELS[field]}: {detail.proposedValues[field] || '-'}
                                </span>
                              ))
                            : '-'}
                        </div>
                      </td>
                      <td>{item.status || '-'}</td>
                      <td>{item.rejectionReason?.trim() || '-'}</td>
                      <td>
                        <div className="tenant-inline-actions">
                          <button
                            type="button"
                            className="btn btn-brand"
                            disabled={workingId === item._id || item.status !== 'pending'}
                            onClick={() => void onAction(item._id, 'approve')}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="btn btn-line"
                            disabled={workingId === item._id || item.status !== 'pending'}
                            onClick={() => void onAction(item._id, 'reject')}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  )
}
