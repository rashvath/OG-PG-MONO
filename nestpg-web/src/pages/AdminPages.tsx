import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Building2, Clock3, MessageSquare, UserRound, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

import { PgDetailsDialog, PgFormDialog, type PgFormValues } from '@/components/pg/PgDialogs'
import { AppTable } from '@/components/data-display/AppTable'
import { EnquiriesChart } from '@/components/charts/EnquiriesChart'
import { EmptyTableState } from '@/components/data-display/EmptyTableState'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import {
  getAdminEnquiries,
  approveOwnerApplication,
  assignPgsToOwner,
  createAdminOwner,
  createAdminPg,
  getAdminOwners,
  getAdminPgs,
  getAdminSummary,
  getAdminUsers,
  getAdminResidents,
  getOwnerApplications,
  markResidentLeftByAdmin,
  rejectOwnerApplication,
  deleteOwner,
  setOwnerStatus,
  setPgStatus,
  setUserStatus,
  updateAdminPg,
  type AdminOwner,
  type AdminEnquiry,
  type AdminPg,
  type AdminUser,
  type AdminResident,
  type OwnerApplication,
} from '@/api/admin-api'
import { inr } from '@/helpers/format'
import { useToast } from '@/lib/toast'
import { NumberTicker } from '@/registry/magicui/number-ticker'

export function AdminOverviewPage() {
  const toast = useToast()
  const [summary, setSummary] = useState({ pgs: 0, owners: 0, users: 0, pending: 0 })
  const [recentPgs, setRecentPgs] = useState<AdminPg[]>([])
  const [recentEnquiries, setRecentEnquiries] = useState<AdminEnquiry[]>([])
  const [isChartLoading, setIsChartLoading] = useState(true)

  const chartValues = useMemo(() => {
    const buckets = Array.from({ length: 7 }).map(() => 0)
    const today = new Date()

    for (const enquiry of recentEnquiries) {
      const createdAt = new Date(enquiry.createdAt)
      const daysAgo = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      if (daysAgo >= 0 && daysAgo < 7) {
        const index = 6 - daysAgo
        buckets[index] += 1
      }
    }

    return buckets
  }, [recentEnquiries])

  useEffect(() => {
    Promise.all([getAdminSummary(), getAdminPgs(), getAdminEnquiries()])
      .then(([summaryData, pgData, enquiryData]) => {
        setSummary(summaryData)
        setRecentPgs(pgData.items.slice(0, 5))
        setRecentEnquiries(enquiryData.items.slice(0, 8))
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load summary'))

    const timer = setTimeout(() => setIsChartLoading(false), 500)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <>
      <div className="admin-hero-row">
        <div>
          <p className="eyebrow">Admin Dashboard</p>
          <h2 className="page-heading">Platform overview</h2>
          <p className="section-sub">Here&apos;s what&apos;s happening on OG PG.</p>
        </div>
        <button type="button" className="btn btn-line admin-range-btn">
          Last 7 days
        </button>
      </div>

      <div className="admin-kpi-grid">
        <div className="admin-kpi-card panel">
          <span className="admin-kpi-icon"><Building2 size={18} /></span>
          <div>
            <strong><NumberTicker value={summary.pgs} /></strong>
            <p>Total PGs</p>
          </div>
        </div>
        <div className="admin-kpi-card panel">
          <span className="admin-kpi-icon"><Users size={18} /></span>
          <div>
            <strong><NumberTicker value={summary.owners} /></strong>
            <p>Owners</p>
          </div>
        </div>
        <div className="admin-kpi-card panel">
          <span className="admin-kpi-icon"><UserRound size={18} /></span>
          <div>
            <strong><NumberTicker value={summary.users} /></strong>
            <p>Users</p>
          </div>
        </div>
        <div className="admin-kpi-card panel">
          <span className="admin-kpi-icon"><Clock3 size={18} /></span>
          <div>
            <strong><NumberTicker value={summary.pending} /></strong>
            <p>Awaiting approval</p>
          </div>
        </div>
      </div>

      <div className="admin-main-grid">
        <EnquiriesChart values={chartValues} isLoading={isChartLoading} />
        <aside className="panel admin-quick-actions">
          <h3>Quick actions</h3>
          <Link to="/admin/pgs" className="admin-action-btn">
            <Building2 size={16} />
            <span>Add new PG</span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/admin/approvals" className="admin-action-btn">
            <Clock3 size={16} />
            <span>View pending approvals</span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/admin/owners" className="admin-action-btn">
            <Users size={16} />
            <span>Manage owners</span>
            <ArrowRight size={16} />
          </Link>
          <Link to="/admin/enquiries" className="admin-action-btn">
            <MessageSquare size={16} />
            <span>View enquiries</span>
            <ArrowRight size={16} />
          </Link>
        </aside>
      </div>

      <div className="admin-recent-grid">
        <div className="panel table-wrap">
          <div className="admin-table-head">
            <h3>Recent enquiries</h3>
            <Link to="/admin/enquiries" className="admin-link-btn">View all</Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>PG</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentEnquiries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-table-cell">
                    <EmptyTableState />
                  </td>
                </tr>
              ) : (
                recentEnquiries.map((item) => {
                  const listingName =
                    typeof item.listingId === 'string' ? item.listingId : item.listingId?.name ?? '-'

                  return (
                    <tr key={item._id}>
                      <td>{item.name}</td>
                      <td>{listingName}</td>
                      <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                      <td>
                        <StatusBadge value={item.status} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="panel table-wrap">
          <div className="admin-table-head">
            <h3>Recent PGs</h3>
            <Link to="/admin/pgs" className="admin-link-btn">View all</Link>
          </div>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Location</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentPgs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="empty-table-cell">
                    <EmptyTableState />
                  </td>
                </tr>
              ) : (
                recentPgs.map((item) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td>{item.area}</td>
                    <td>
                      <StatusBadge value={item.status as 'pending' | 'live' | 'suspended' | 'rejected'} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

export function AdminEnquiriesPage() {
  const toast = useToast()
  const [items, setItems] = useState<AdminEnquiry[]>([])

  useEffect(() => {
    getAdminEnquiries()
      .then((data) => setItems(data.items))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load enquiries'))
  }, [toast])

  return (
    <>
      <h2 className="page-heading">All enquiries</h2>
      <AppTable headers={['Name', 'PG', 'Phone', 'Date', 'Status']}>
        {items.length === 0 ? (
          <tr>
            <td colSpan={5} className="empty-table-cell">
              <EmptyTableState />
            </td>
          </tr>
        ) : (
          items.map((item) => {
            const listingName =
              typeof item.listingId === 'string' ? item.listingId : item.listingId?.name ?? '-'

            return (
              <tr key={item._id}>
                <td>{item.name}</td>
                <td>{listingName}</td>
                <td>{item.phone}</td>
                <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                <td>
                  <StatusBadge value={item.status} />
                </td>
              </tr>
            )
          })
        )}
      </AppTable>
    </>
  )
}

export function AdminPgsPage() {
  const toast = useToast()
  const [items, setItems] = useState<AdminPg[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingItem, setEditingItem] = useState<AdminPg | null>(null)
  const [viewingItem, setViewingItem] = useState<AdminPg | null>(null)

  const load = () => {
    getAdminPgs()
      .then((data) => setItems(data.items))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load PGs'))
  }

  useEffect(() => {
    load()
  }, [])

  const initialFormValues = useMemo<Partial<PgFormValues> | undefined>(() => {
    if (!editingItem) {
      return undefined
    }

    return {
      name: editingItem.name,
      area: editingItem.area,
      address: editingItem.address,
      baseRent: editingItem.baseRent,
      totalRooms: editingItem.totalRooms ?? 0,
      totalBeds: editingItem.totalBeds ?? 0,
      gender: editingItem.gender ?? 'Co-ed',
      amenities: editingItem.amenities ?? [],
      photos: editingItem.photos ?? [],
      mapsLocation: editingItem.mapsLocation ?? '',
      latitude: editingItem.latitude ?? null,
      longitude: editingItem.longitude ?? null,
    }
  }, [editingItem])

  const submit = async (values: PgFormValues) => {
    if (!values.name.trim() || !values.address.trim() || !values.area.trim()) {
      toast.warning('Please fill PG name, address and area')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        name: values.name.trim(),
        address: values.address.trim(),
        area: values.area.trim(),
        mapsLocation: values.mapsLocation.trim(),
        latitude: values.latitude ?? undefined,
        longitude: values.longitude ?? undefined,
        baseRent: values.baseRent,
        totalRooms: values.totalRooms,
        totalBeds: values.totalBeds,
        gender: values.gender,
        amenities: values.amenities,
        photos: values.photos,
      }

      if (editingItem) {
        await updateAdminPg(editingItem._id, payload)
        toast.success('PG details updated')
      } else {
        await createAdminPg({ ...payload, status: 'unassigned' })
        toast.success('PG created successfully')
      }

      setIsFormOpen(false)
      setEditingItem(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save PG')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleStatus = async (pg: AdminPg) => {
    const next = pg.status === 'live' ? 'suspended' : 'live'
    await setPgStatus(pg._id, next)
    toast.info(`PG status updated to ${next}`)
    load()
  }

  return (
    <>
      <div className="admin-hero-row">
        <div>
          <h2 className="page-heading">PG listings</h2>
          <p className="section-sub">Manage all PG properties with view and edit actions.</p>
        </div>
        <button
          type="button"
          className="btn btn-brand"
          onClick={() => {
            setEditingItem(null)
            setIsFormOpen(true)
          }}
        >
          Add new PG
        </button>
      </div>

      <AppTable headers={['PG', 'Area', 'Rent', 'Status', 'Location', 'Images', 'Action']}>
        {items.map((listing) => (
          <tr key={listing._id}>
            <td>{listing.name}</td>
            <td>{listing.area}</td>
            <td>{inr(listing.baseRent)}</td>
            <td>
              <StatusBadge value={listing.status as 'pending' | 'live' | 'suspended' | 'rejected'} />
            </td>
            <td>{listing.mapsLocation ? 'Pinned' : 'Not set'}</td>
            <td>{listing.photos?.length ?? 0}</td>
            <td>
              <div className="table-action-row">
                <button type="button" className="btn btn-line" onClick={() => setViewingItem(listing)}>
                  View
                </button>
                <button
                  type="button"
                  className="btn btn-line"
                  onClick={() => {
                    setEditingItem(listing)
                    setIsFormOpen(true)
                  }}
                >
                  Edit
                </button>
                <button type="button" className="btn btn-line" onClick={() => toggleStatus(listing)}>
                  {listing.status === 'live' ? 'Suspend' : 'Approve'}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </AppTable>

      <PgFormDialog
        open={isFormOpen}
        role="admin"
        mode={editingItem ? 'edit' : 'create'}
        title={editingItem ? 'Edit PG details' : 'Add a new PG'}
        submitLabel={editingItem ? 'Save changes' : 'Create PG'}
        initialValues={initialFormValues}
        isSubmitting={isSaving}
        onClose={() => {
          if (!isSaving) {
            setIsFormOpen(false)
            setEditingItem(null)
          }
        }}
        onSubmit={submit}
      />

      <PgDetailsDialog open={Boolean(viewingItem)} item={viewingItem} onClose={() => setViewingItem(null)} />
    </>
  )
}

export function AdminOwnersPage() {
  const toast = useToast()
  const [owners, setOwners] = useState<AdminOwner[]>([])
  const [pgs, setPgs] = useState<AdminPg[]>([])
  const [viewingOwner, setViewingOwner] = useState<AdminOwner | null>(null)
  const [isCreateOwnerDialogOpen, setIsCreateOwnerDialogOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [ownerPassword, setOwnerPassword] = useState('Temp@123')
  const [assignOwnerId, setAssignOwnerId] = useState('')
  const [selectedPgIds, setSelectedPgIds] = useState<string[]>([])

  const load = () => {
    getAdminOwners()
      .then((data) => setOwners(data.items))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load owners'))
    getAdminPgs()
      .then((data) => setPgs(data.items))
      .catch(() => undefined)
  }

  useEffect(() => {
    load()
  }, [])

  const createOwner = async () => {
    if (!ownerName.trim() || !ownerEmail.trim() || !ownerPhone.trim()) {
      toast.warning('Please fill owner name, email and phone')
      return
    }

    if (!/^\d{10}$/.test(ownerPhone.trim())) {
      toast.warning('Mobile number must be exactly 10 digits')
      return
    }

    await createAdminOwner({
      name: ownerName.trim(),
      email: ownerEmail.trim(),
      phone: ownerPhone.trim(),
      temporaryPassword: ownerPassword,
      assignedPgIds: [],
    })

    toast.success('Owner created with temporary credentials')
    setOwnerName('')
    setOwnerEmail('')
    setOwnerPhone('')
    setOwnerPassword('Temp@123')
    setIsCreateOwnerDialogOpen(false)
    load()
  }

  const assignPgs = async () => {
    if (!assignOwnerId) {
      toast.warning('Select an owner id for assignment')
      return
    }

    if (selectedPgIds.length === 0) {
      toast.warning('Select at least one PG')
      return
    }

    await assignPgsToOwner(assignOwnerId, selectedPgIds)
    toast.success('PGs assigned successfully')
    setSelectedPgIds([])
    setIsAssignDialogOpen(false)
    load()
  }

  const unassignedPgs = useMemo(() => pgs.filter((item) => !item.owner), [pgs])

  const pgsForSelectedOwner = useMemo(() => {
    if (!assignOwnerId) {
      return [] as AdminPg[]
    }

    return pgs.filter((item) => !item.ownerId || item.ownerId === assignOwnerId)
  }, [assignOwnerId, pgs])

  const pgsForViewingOwner = useMemo(() => {
    if (!viewingOwner) {
      return [] as AdminPg[]
    }
    return pgs.filter((item) => item.ownerId === viewingOwner._id)
  }, [pgs, viewingOwner])

  const toggleOwnerStatus = async (owner: AdminOwner) => {
    const next = owner.status === 'active' ? 'blocked' : 'active'
    await setOwnerStatus(owner._id, next)
    toast.info(`Owner status changed to ${next}`)
    load()
  }

  const removeOwner = async (owner: AdminOwner) => {
    await deleteOwner(owner._id)
    toast.warning(`Owner ${owner.name} deleted`)
    load()
  }

  return (
    <>
      <div className="admin-hero-row">
        <div>
          <h2 className="page-heading">PG owners</h2>
          <p className="section-sub">Create owner accounts and assign PGs using dialogs.</p>
        </div>
        <div className="table-action-row">
          <button type="button" className="btn btn-brand" onClick={() => setIsCreateOwnerDialogOpen(true)}>
            Create owner
          </button>
          <button type="button" className="btn btn-line" onClick={() => setIsAssignDialogOpen(true)}>
            Assign PGs
          </button>
        </div>
      </div>

      <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
        <p className="section-sub">Unassigned PGs: {unassignedPgs.map((item) => item.name).join(', ') || 'none'}</p>
      </div>

      <AppTable headers={['Owner', 'Phone', 'PGs', 'KYC', 'Action']}>
        {owners.map((owner) => (
          <tr key={owner._id}>
            <td>{owner.name}</td>
            <td>{owner.phone}</td>
            <td>{owner.pgCount}</td>
            <td>
              <StatusBadge
                value={
                  owner.ownerStatus === 'approved'
                    ? 'live'
                    : owner.ownerStatus === 'pending'
                      ? 'pending'
                      : 'rejected'
                }
              />
            </td>
            <td>
              <div className="table-action-row">
                <button type="button" className="btn btn-line" onClick={() => setViewingOwner(owner)}>
                  View
                </button>
                <button type="button" className="btn btn-line" onClick={() => toggleOwnerStatus(owner)}>
                  {owner.status === 'active' ? 'Block' : 'Unblock'}
                </button>
                <button type="button" className="btn btn-line" onClick={() => removeOwner(owner)}>
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </AppTable>

      {viewingOwner ? (
        <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Owner details">
          <div className="app-dialog app-dialog-wide">
            <div className="app-dialog-head">
              <div>
                <h3>{viewingOwner.name}</h3>
                <p>{viewingOwner.email}</p>
              </div>
              <button type="button" className="btn btn-line" onClick={() => setViewingOwner(null)}>
                Close
              </button>
            </div>

            <div className="detail-grid-compact">
              <p><strong>Phone:</strong> {viewingOwner.phone}</p>
              <p><strong>Owner status:</strong> {viewingOwner.status}</p>
              <p><strong>KYC:</strong> {viewingOwner.ownerStatus}</p>
              <p><strong>Total PGs assigned:</strong> {pgsForViewingOwner.length}</p>
            </div>

            <h3 style={{ marginTop: 10 }}>Assigned PGs</h3>
            <table>
              <thead>
                <tr>
                  <th>PG name</th>
                  <th>Area</th>
                  <th>Status</th>
                  <th>Rooms</th>
                  <th>Capacity</th>
                </tr>
              </thead>
              <tbody>
                {pgsForViewingOwner.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">
                      <EmptyTableState />
                    </td>
                  </tr>
                ) : (
                  pgsForViewingOwner.map((pg) => (
                    <tr key={pg._id}>
                      <td>{pg.name}</td>
                      <td>{pg.area}</td>
                      <td>
                        <StatusBadge value={pg.status as 'pending' | 'live' | 'suspended' | 'rejected'} />
                      </td>
                      <td>{pg.totalRooms ?? 0}</td>
                      <td>{pg.totalBeds ?? 0}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {isCreateOwnerDialogOpen ? (
        <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Create owner">
          <div className="app-dialog">
            <div className="app-dialog-head">
              <div>
                <h3>Create owner</h3>
                <p>Create a PG owner account with 10-digit mobile validation.</p>
              </div>
            </div>
            <div className="form-grid two-col">
              <div className="form-field">
                <label>Owner name</label>
                <input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} />
              </div>
              <div className="form-field">
                <label>Phone</label>
                <input
                  value={ownerPhone}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  onChange={(event) => setOwnerPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10 digits"
                />
              </div>
              <div className="form-field">
                <label>Temporary password</label>
                <input value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} />
              </div>
            </div>
            <div className="pg-form-actions">
              <button type="button" className="btn btn-line" onClick={() => setIsCreateOwnerDialogOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-brand" onClick={createOwner}>
                Create owner
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isAssignDialogOpen ? (
        <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Assign PGs">
          <div className="app-dialog">
            <div className="app-dialog-head">
              <div>
                <h3>Assign PGs</h3>
                <p>Select owner and choose PG names from multi-select list.</p>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-field">
                <label>PG owner</label>
                <select
                  value={assignOwnerId}
                  onChange={(event) => {
                    setAssignOwnerId(event.target.value)
                    setSelectedPgIds([])
                  }}
                >
                  <option value="">Select owner</option>
                  {owners.map((owner) => (
                    <option key={owner._id} value={owner._id}>
                      {owner.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>PG names (multi-select)</label>
                <div className="inline-check-list">
                  {pgsForSelectedOwner.length === 0 ? (
                    <span className="section-sub">Select owner to view available PG names.</span>
                  ) : (
                    pgsForSelectedOwner.map((pg) => (
                      <label key={pg._id} className="checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedPgIds.includes(pg._id)}
                          onChange={() => {
                            setSelectedPgIds((current) =>
                              current.includes(pg._id)
                                ? current.filter((id) => id !== pg._id)
                                : [...current, pg._id],
                            )
                          }}
                        />
                        <span>{pg.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="pg-form-actions">
              <button type="button" className="btn btn-line" onClick={() => setIsAssignDialogOpen(false)}>
                Cancel
              </button>
              <button type="button" className="btn btn-brand" onClick={assignPgs}>
                Assign selected PGs
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function AdminUsersPage() {
  const toast = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])

  const load = () => {
    getAdminUsers()
      .then((data) => setUsers(data.items))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load users'))
  }

  useEffect(() => {
    load()
  }, [])

  const toggleUser = async (user: AdminUser) => {
    const nextStatus = user.status === 'active' ? 'blocked' : 'active'
    await setUserStatus(user._id, nextStatus)
    toast.info(`User status changed to ${nextStatus}`)
    load()
  }

  return (
    <>
      <h2 className="page-heading">Customers</h2>
      <AppTable headers={['Name', 'Email', 'Status', 'Action']}>
        {users.map((user) => (
          <tr key={user._id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>
              <StatusBadge value={user.status} />
            </td>
            <td>
              <button type="button" className="btn btn-line" onClick={() => toggleUser(user)}>
                {user.status === 'blocked' ? 'Unblock' : 'Block'}
              </button>
            </td>
          </tr>
        ))}
      </AppTable>
    </>
  )
}

export function AdminResidentsPage() {
  const toast = useToast()
  const [items, setItems] = useState<AdminResident[]>([])
  const [markingResidentId, setMarkingResidentId] = useState('')
  const [form, setForm] = useState({
    leavingDate: new Date().toISOString().slice(0, 10),
    reason: '',
    finalSettlementAmount: 0,
    finalSettlementPaid: false,
    notes: '',
  })

  const toNumberValue = (value: number) => (value === 0 ? '' : String(value))
  const parseNumberInput = (value: string) => {
    if (value.trim() === '') {
      return 0
    }
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const load = () => {
    getAdminResidents()
      .then((data) => setItems(data.items))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load residents'))
  }

  useEffect(() => {
    load()
  }, [])

  const markLeft = async () => {
    if (!markingResidentId) {
      return
    }

    try {
      await markResidentLeftByAdmin(markingResidentId, {
        leavingDate: form.leavingDate,
        reason: form.reason,
        finalSettlementAmount: form.finalSettlementAmount,
        finalSettlementPaid: form.finalSettlementPaid,
        notes: form.notes,
      })
      toast.success('Resident marked as left')
      setMarkingResidentId('')
      setForm((current) => ({ ...current, reason: '', finalSettlementAmount: 0, finalSettlementPaid: false, notes: '' }))
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update resident')
    }
  }

  return (
    <>
      <div className="admin-hero-row">
        <div>
          <h2 className="page-heading">Residents</h2>
          <p className="section-sub">Admin can close resident stay and record final settlement paid by owner.</p>
        </div>
      </div>

      {markingResidentId ? (
        <div className="panel form-grid two-col spaced-top">
          <div className="form-field">
            <label>Leaving date</label>
            <input type="date" value={form.leavingDate} onChange={(event) => setForm((current) => ({ ...current, leavingDate: event.target.value }))} />
          </div>
          <div className="form-field">
            <label>Final settlement amount</label>
            <input type="number" value={toNumberValue(form.finalSettlementAmount)} onChange={(event) => setForm((current) => ({ ...current, finalSettlementAmount: parseNumberInput(event.target.value) }))} />
          </div>
          <div className="form-field">
            <label>Reason</label>
            <input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} />
          </div>
          <div className="form-field">
            <label>Settlement paid by owner</label>
            <select value={form.finalSettlementPaid ? 'yes' : 'no'} onChange={(event) => setForm((current) => ({ ...current, finalSettlementPaid: event.target.value === 'yes' }))}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label>Notes</label>
            <input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
          </div>
          <div className="table-action-row" style={{ gridColumn: '1 / -1' }}>
            <button type="button" className="btn btn-line" onClick={() => setMarkingResidentId('')}>Cancel</button>
            <button type="button" className="btn btn-brand" onClick={markLeft}>Mark left</button>
          </div>
        </div>
      ) : null}

      <AppTable headers={['Resident', 'PG', 'Owner', 'Phone', 'Paid', 'Due', 'Final settlement', 'Status', 'Action']}>
        {items.length === 0 ? (
          <tr>
            <td colSpan={9} className="empty-table-cell">
              <EmptyTableState />
            </td>
          </tr>
        ) : (
          items.map((item) => {
            const pgName = typeof item.pgId === 'string' ? item.pgId : item.pgId?.name ?? '-'
            const ownerName = typeof item.ownerId === 'string' ? item.ownerId : item.ownerId?.name ?? '-'
            return (
              <tr key={item._id}>
                <td>{item.fullName}</td>
                <td>{pgName}</td>
                <td>{ownerName}</td>
                <td>{item.phone}</td>
                <td>{inr(item.amountPaid ?? 0)}</td>
                <td>{inr(item.amountDue ?? 0)}</td>
                <td>{inr(item.finalSettlementAmount ?? 0)}</td>
                <td>
                  <StatusBadge value={item.status} />
                </td>
                <td>
                  {item.status !== 'left' ? (
                    <button type="button" className="btn btn-line" onClick={() => setMarkingResidentId(item._id)}>
                      Mark left
                    </button>
                  ) : (
                    <span>-</span>
                  )}
                </td>
              </tr>
            )
          })
        )}
      </AppTable>
    </>
  )
}

export function AdminOwnerApprovalsPage() {
  const toast = useToast()
  const [applications, setApplications] = useState<OwnerApplication[]>([])

  const load = () => {
    getOwnerApplications()
      .then((data) => setApplications(data.items))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load approvals'))
  }

  useEffect(() => {
    load()
  }, [])

  const approve = async (id: string) => {
    await approveOwnerApplication(id)
    toast.success('Owner application approved')
    load()
  }

  const reject = async (id: string) => {
    await rejectOwnerApplication(id)
    toast.warning('Owner application rejected')
    load()
  }

  return (
    <>
      <h2 className="page-heading">Owner approvals</h2>
      <AppTable headers={['Owner', 'PG', 'Area', 'Mobile', 'Actions']}>
        {applications.map((item) => (
          <tr key={item._id}>
            <td>{item.name}</td>
            <td>{item.pgName}</td>
            <td>{item.area}</td>
            <td>{item.mobile}</td>
            <td style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-brand" onClick={() => approve(item._id)}>
                Approve
              </button>
              <button type="button" className="btn btn-line" onClick={() => reject(item._id)}>
                Reject
              </button>
            </td>
          </tr>
        ))}
      </AppTable>
    </>
  )
}
