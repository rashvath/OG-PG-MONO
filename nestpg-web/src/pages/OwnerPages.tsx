import { useEffect, useMemo, useState } from 'react'

import { PgDetailsDialog, PgFormDialog, type PgFormValues } from '@/components/pg/PgDialogs'
import { EnquiriesChart } from '@/components/charts/EnquiriesChart'
import { AppTable } from '@/components/data-display/AppTable'
import { EmptyTableState } from '@/components/data-display/EmptyTableState'
import { StatCard } from '@/components/data-display/StatCard'
import { StatusBadge } from '@/components/data-display/StatusBadge'
import { inr } from '@/helpers/format'
import { uploadPgImages } from '@/api/upload-api'
import {
  createOwnerResident,
  getOwnerEnquiries,
  getOwnerPgs,
  getOwnerResidents,
  getOwnerSummary,
  initializeOwnerPgBeds,
  markOwnerResidentLeft,
  type OwnerEnquiry,
  type OwnerPg,
  type OwnerResident,
  updateOwnerResident,
  updateOwnerPg,
} from '@/api/owner-api'
import { useToast } from '@/lib/toast'

function buildRoomTypes(baseRent: number) {
  return [
    { sharing: 'Single' as const, rent: Math.round(baseRent * 1.55), deposit: Math.round(baseRent * 3.1) },
    { sharing: 'Double' as const, rent: Math.round(baseRent * 1.2), deposit: Math.round(baseRent * 2.4) },
    { sharing: 'Triple' as const, rent: baseRent, deposit: baseRent * 2 },
  ]
}

const PENDING_LABEL_MAP: Record<keyof PgFormValues, string> = {
  name: 'PG name',
  area: 'Area',
  address: 'Address',
  pincode: 'Pincode',
  description: 'Description',
  baseRent: 'Starting rent',
  deposit: 'Deposit',
  maintenance: 'Maintenance',
  foodCharges: 'Food charges',
  otherCharges: 'Other charges',
  electricityRules: 'Electricity rules',
  totalRooms: 'Total rooms',
  totalBeds: 'Total capacity',
  pgType: 'PG type',
  totalFloors: 'Total floors',
  gender: 'Gender',
  foodAvailable: 'Food availability',
  weeklyMenu: '7-day menu',
  curfew: 'Curfew',
  securityInfo: 'Security info',
  contactName: 'Contact name',
  contactPhone: 'Contact phone',
  amenities: 'Amenities',
  photos: 'Photos',
  mapsLocation: 'Map pin',
  latitude: 'Latitude',
  longitude: 'Longitude',
}

function getPendingOwnerFields(pg: OwnerPg): Array<keyof PgFormValues> {
  const pending: Array<keyof PgFormValues> = []
  if (!pg.description?.trim()) pending.push('description')
  if (!pg.mapsLocation?.trim()) pending.push('mapsLocation')
  if ((pg.photos?.length ?? 0) === 0) pending.push('photos')
  if ((pg.amenities?.length ?? 0) === 0) pending.push('amenities')
  if (!pg.pincode?.trim()) pending.push('pincode')
  if (!pg.contactName?.trim()) pending.push('contactName')
  if (!pg.contactPhone?.trim()) pending.push('contactPhone')
  if (!pg.pgType?.trim()) pending.push('pgType')
  if ((pg.totalFloors ?? 0) <= 0) pending.push('totalFloors')
  if (!pg.curfew?.trim()) pending.push('curfew')
  if (!pg.securityInfo?.trim()) pending.push('securityInfo')
  if (!pg.electricityRules?.trim()) pending.push('electricityRules')
  if ((pg.weeklyMenu?.length ?? 0) < 7) pending.push('weeklyMenu')
  return pending
}

export function OwnerOverviewPage() {
  const toast = useToast()
  const [summary, setSummary] = useState({
    activeListings: 0,
    enquiries: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    availableBeds: 0,
    activeResidents: 0,
    leftResidents: 0,
    occupancy: 0,
    averageRating: 0,
    weeklyEnquiries: [] as Array<{ label: string; count: number }>,
  })
  const [isChartLoading, setIsChartLoading] = useState(true)

  useEffect(() => {
    getOwnerSummary()
      .then((data) => setSummary(data))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load owner summary'))

    const timer = setTimeout(() => setIsChartLoading(false), 1200)
    return () => clearTimeout(timer)
  }, [toast])

  return (
    <>
      <h2 className="page-heading">Hello, Owner</h2>
      <div className="stats-grid">
        <StatCard variant="indigo" label="Active PGs" value={summary.activeListings} />
        <StatCard variant="orange" label="Total enquiries" value={summary.enquiries} />
        <StatCard variant="teal" label="Active residents" value={summary.activeResidents} />
        <StatCard variant="amber" label="Available beds" value={summary.availableBeds} />
      </div>
      <div className="stats-grid">
        <StatCard variant="indigo" label="Total bed records" value={summary.totalBeds} />
        <StatCard variant="orange" label="Occupied beds" value={summary.occupiedBeds} />
        <StatCard variant="teal" label="Occupancy rate" value={`${summary.occupancy}%`} />
        <StatCard variant="amber" label="Residents left" value={summary.leftResidents} />
      </div>
      <EnquiriesChart
        values={summary.weeklyEnquiries.map((item) => item.count)}
        labels={summary.weeklyEnquiries.map((item) => item.label)}
        isLoading={isChartLoading}
      />
    </>
  )
}

export function OwnerAddPgPage() {
  const toast = useToast()
  const [items, setItems] = useState<OwnerPg[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<OwnerPg | null>(null)
  const [viewingItem, setViewingItem] = useState<OwnerPg | null>(null)

  const load = () => {
    setIsLoading(true)
    getOwnerPgs()
      .then((data) => setItems(data.items))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load your PGs'))
      .finally(() => setIsLoading(false))
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
      pincode: editingItem.pincode ?? '',
      description: editingItem.description ?? '',
      baseRent: editingItem.baseRent,
      deposit: editingItem.deposit ?? 0,
      maintenance: editingItem.maintenance ?? 0,
      foodCharges: editingItem.foodCharges ?? 0,
      otherCharges: editingItem.otherCharges ?? 0,
      electricityRules: editingItem.electricityRules ?? '',
      totalRooms: editingItem.totalRooms ?? 0,
      totalBeds: editingItem.totalBeds ?? 0,
      pgType: editingItem.pgType ?? '',
      totalFloors: editingItem.totalFloors ?? 0,
      gender: editingItem.gender,
      foodAvailable: editingItem.foodAvailable ?? false,
      weeklyMenu: editingItem.weeklyMenu ?? [],
      curfew: editingItem.curfew ?? '',
      securityInfo: editingItem.securityInfo ?? '',
      contactName: editingItem.contactName ?? '',
      contactPhone: editingItem.contactPhone ?? '',
      amenities: editingItem.amenities,
      photos: editingItem.photos,
      mapsLocation: editingItem.mapsLocation ?? '',
      latitude: editingItem.latitude ?? null,
      longitude: editingItem.longitude ?? null,
    }
  }, [editingItem])

  const openEditDialog = (item: OwnerPg) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const pendingFormFields = useMemo(() => {
    if (!editingItem) {
      return [] as Array<keyof PgFormValues>
    }
    return getPendingOwnerFields(editingItem)
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
        area: values.area.trim(),
        address: values.address.trim(),
        pincode: values.pincode.trim(),
        mapsLocation: values.mapsLocation.trim(),
        latitude: values.latitude ?? undefined,
        longitude: values.longitude ?? undefined,
        description: values.description.trim(),
        baseRent: values.baseRent,
        deposit: values.deposit,
        maintenance: values.maintenance,
        foodCharges: values.foodCharges,
        otherCharges: values.otherCharges,
        electricityRules: values.electricityRules.trim(),
        totalRooms: values.totalRooms,
        totalBeds: values.totalBeds,
        pgType: values.pgType.trim(),
        totalFloors: values.totalFloors,
        gender: values.gender,
        foodAvailable: values.foodAvailable,
        weeklyMenu: values.weeklyMenu,
        curfew: values.curfew.trim(),
        securityInfo: values.securityInfo.trim(),
        contactName: values.contactName.trim(),
        contactPhone: values.contactPhone.trim(),
        amenities: values.amenities,
        photos: values.photos,
        roomTypes: buildRoomTypes(values.baseRent),
      }

      if (!editingItem) {
        toast.warning('Only admin can create and assign PGs.')
        return
      }

      await updateOwnerPg(editingItem._id, payload)
      toast.success('PG details updated')

      setIsFormOpen(false)
      setEditingItem(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save PG')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="admin-hero-row">
        <div>
          <h2 className="page-heading">My PGs</h2>
          <p className="section-sub">View and update your assigned PG details. Only admin can create and assign PGs.</p>
        </div>
      </div>

      <AppTable headers={['PG', 'Area', 'Rent', 'Status', 'Location', 'Images', 'Pending details', 'Actions']}>
        {isLoading ? (
          <tr>
            <td colSpan={8} className="empty-table-cell">
              Loading PGs...
            </td>
          </tr>
        ) : items.length === 0 ? (
          <tr>
            <td colSpan={8} className="empty-table-cell">
              <EmptyTableState />
            </td>
          </tr>
        ) : (
          items.map((item) => (
            <tr key={item._id}>
              {/** Owner checklist after admin creates a PG */}
              {(() => {
                const pending = getPendingOwnerFields(item)
                return (
                  <>
              <td>{item.name}</td>
              <td>{item.area}</td>
              <td>{inr(item.baseRent)}</td>
              <td>
                <StatusBadge value={item.status} />
              </td>
              <td>{item.mapsLocation ? 'Pinned' : 'Not set'}</td>
              <td>{item.photos?.length ?? 0}</td>
              <td>
                {pending.length > 0 ? (
                  <span>{`${pending.length} pending: ${pending.slice(0, 3).map((key) => PENDING_LABEL_MAP[key]).join(', ')}${pending.length > 3 ? '...' : ''}`}</span>
                ) : (
                  <span>Complete</span>
                )}
              </td>
              <td>
                <div className="table-action-row">
                  <button type="button" className="btn btn-line" onClick={() => setViewingItem(item)}>
                    View
                  </button>
                  <button type="button" className="btn btn-line" onClick={() => openEditDialog(item)}>
                    Edit
                  </button>
                </div>
              </td>
                  </>
                )
              })()}
            </tr>
          ))
        )}
      </AppTable>

      <PgFormDialog
        open={isFormOpen}
        role="owner"
        mode="edit"
        title="Edit PG details"
        submitLabel="Save changes"
        initialValues={initialFormValues}
        pendingFields={pendingFormFields}
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

export function OwnerEnquiriesPage() {
  const toast = useToast()
  const [enquiries, setEnquiries] = useState<OwnerEnquiry[]>([])

  useEffect(() => {
    getOwnerEnquiries()
      .then((data) => setEnquiries(data.items))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load enquiries'))
  }, [toast])

  return (
    <>
      <h2 className="page-heading">Enquiries</h2>
      <AppTable headers={['Name', 'PG', 'Phone', 'Date', 'Status']}>
        {enquiries.map((enquiry) => {
          const listingName =
            typeof enquiry.listingId === 'string'
              ? enquiry.listingId
              : enquiry.listingId?.name ?? '-'

          return (
            <tr key={enquiry._id}>
              <td>{enquiry.name}</td>
              <td>{listingName}</td>
              <td>{enquiry.phone}</td>
              <td>{new Date(enquiry.createdAt).toLocaleDateString()}</td>
              <td>
                <StatusBadge value={enquiry.status} />
              </td>
            </tr>
          )
        })}
      </AppTable>
    </>
  )
}

export function OwnerResidentsPage() {
  const toast = useToast()
  const [pgs, setPgs] = useState<OwnerPg[]>([])
  const [residents, setResidents] = useState<OwnerResident[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingResident, setIsUpdatingResident] = useState(false)
  const [isMarkingLeft, setIsMarkingLeft] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isInitializingBeds, setIsInitializingBeds] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [residentErrors, setResidentErrors] = useState<{ pgId?: string; fullName?: string; phone?: string; rent?: string }>({})
  const [residentFormError, setResidentFormError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [joinedFrom, setJoinedFrom] = useState('')
  const [joinedTo, setJoinedTo] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<'all' | OwnerResident['status']>('all')
  const [viewingResident, setViewingResident] = useState<OwnerResident | null>(null)
  const [editingResident, setEditingResident] = useState<OwnerResident | null>(null)
  const [leftResident, setLeftResident] = useState<OwnerResident | null>(null)
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    joiningDate: '',
    rent: 0,
    deposit: 0,
    amountPaid: 0,
  })
  const [leftForm, setLeftForm] = useState({
    leavingDate: new Date().toISOString().slice(0, 10),
    finalSettlementAmount: 0,
    finalSettlementPaid: false,
    reason: '',
    notes: '',
  })
  const [form, setForm] = useState({
    pgId: '',
    fullName: '',
    phone: '',
    joiningDate: new Date().toISOString().slice(0, 10),
    rent: 0,
    deposit: 0,
    amountPaid: 0,
    profilePhoto: '',
  })

  const toNumberValue = (value: number) => (value === 0 ? '' : String(value))
  const parseNumberInput = (value: string) => {
    if (value.trim() === '') {
      return 0
    }
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const updateResidentField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setResidentFormError('')
    setResidentErrors((current) => {
      if (!current[key as keyof typeof residentErrors]) {
        return current
      }
      const { [key as keyof typeof residentErrors]: _removed, ...rest } = current
      return rest
    })
  }

  const load = () => {
    Promise.all([getOwnerPgs(), getOwnerResidents()])
      .then(([pgData, residentData]) => {
        setPgs(pgData.items)
        setResidents(residentData.items)
        setForm((current) => {
          if (!current.pgId && pgData.items.length > 0) {
            return { ...current, pgId: pgData.items[0]._id }
          }
          return current
        })
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load residents'))
  }

  useEffect(() => {
    load()
  }, [])

  const pgNameMap = useMemo(
    () => new Map(pgs.map((item) => [item._id, item.name])),
    [pgs],
  )

  const selectedPg = useMemo(
    () => pgs.find((item) => item._id === form.pgId) ?? null,
    [pgs, form.pgId],
  )

  const selectedPgAssignableBeds = typeof selectedPg?.availableBeds === 'number' ? selectedPg.availableBeds : null
  const selectedPgConfiguredCapacity = selectedPg?.totalBeds ?? 0
  const selectedPgHasNoBeds = selectedPgAssignableBeds !== null && selectedPgAssignableBeds <= 0

  const filteredResidents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const fromDate = joinedFrom ? new Date(joinedFrom) : null
    const toDate = joinedTo ? new Date(joinedTo) : null

    return residents.filter((resident) => {
      if (selectedStatus !== 'all' && resident.status !== selectedStatus) {
        return false
      }

      if (query) {
        const pgName = (pgNameMap.get(resident.pgId) ?? '').toLowerCase()
        const matchesQuery =
          resident.fullName.toLowerCase().includes(query) ||
          resident.phone.includes(query) ||
          pgName.includes(query)
        if (!matchesQuery) {
          return false
        }
      }

      const joinDate = new Date(resident.joiningDate)
      if (fromDate && joinDate < fromDate) {
        return false
      }
      if (toDate) {
        const endDate = new Date(toDate)
        endDate.setHours(23, 59, 59, 999)
        if (joinDate > endDate) {
          return false
        }
      }

      return true
    })
  }, [residents, searchQuery, joinedFrom, joinedTo, selectedStatus, pgNameMap])

  const openAddDialog = () => {
    setForm((current) => ({
      ...current,
      pgId: current.pgId || pgs[0]?._id || '',
      fullName: '',
      phone: '',
      joiningDate: new Date().toISOString().slice(0, 10),
      rent: 0,
      deposit: 0,
      amountPaid: 0,
      profilePhoto: '',
    }))
    setSelectedImageFile(null)
    setUploadError('')
    setResidentErrors({})
    setResidentFormError('')
    setIsFormOpen(true)
  }

  const openEditResidentDialog = (resident: OwnerResident) => {
    setEditingResident(resident)
    setEditForm({
      fullName: resident.fullName,
      phone: resident.phone,
      joiningDate: new Date(resident.joiningDate).toISOString().slice(0, 10),
      rent: resident.rent,
      deposit: resident.deposit,
      amountPaid: resident.amountPaid ?? 0,
    })
  }

  const openMarkLeftDialog = (resident: OwnerResident) => {
    setLeftResident(resident)
    setLeftForm({
      leavingDate: new Date().toISOString().slice(0, 10),
      finalSettlementAmount: resident.finalSettlementAmount ?? 0,
      finalSettlementPaid: false,
      reason: '',
      notes: '',
    })
  }

  const uploadResidentPhoto = async () => {
    if (!selectedImageFile) {
      setUploadError('Please choose an image first.')
      return
    }

    setUploadError('')
    setIsUploadingImage(true)
    try {
      const urls = await uploadPgImages([selectedImageFile])
      const uploadedUrl = urls[0]
      if (!uploadedUrl) {
        setUploadError('Image upload failed. No URL returned.')
        return
      }

      setForm((current) => ({ ...current, profilePhoto: uploadedUrl }))
      setSelectedImageFile(null)
      toast.success('Resident image uploaded')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Image upload failed')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const initializeBeds = async () => {
    if (!form.pgId) {
      setResidentErrors((current) => ({ ...current, pgId: 'Please choose a PG' }))
      return
    }

    setIsInitializingBeds(true)
    setResidentFormError('')
    try {
      const result = await initializeOwnerPgBeds(form.pgId)
      toast.success(`Bed inventory ready: +${result.createdBeds} beds, +${result.createdRooms} rooms`)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to initialize beds')
    } finally {
      setIsInitializingBeds(false)
    }
  }

  const addResident = async () => {
    const nextErrors: { pgId?: string; fullName?: string; phone?: string; rent?: string } = {}
    if (!form.pgId) {
      nextErrors.pgId = 'Please choose a PG'
    }
    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Resident name is required'
    }
    if (!/^\d{10}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Phone must be exactly 10 digits'
    }
    if (form.rent <= 0) {
      nextErrors.rent = 'Monthly rent must be greater than 0'
    }

    if (Object.keys(nextErrors).length > 0) {
      setResidentErrors(nextErrors)
      return
    }

    if (selectedPgHasNoBeds) {
      setResidentFormError('No available bed found in this PG. Add more beds or choose another PG.')
      return
    }

    setIsSaving(true)
    try {
      const sanitizedProfilePhoto = form.profilePhoto.trim()
      await createOwnerResident({
        pgId: form.pgId,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        joiningDate: form.joiningDate,
        rent: form.rent,
        deposit: form.deposit,
        amountPaid: form.amountPaid,
        profilePhoto: sanitizedProfilePhoto || undefined,
      })

      toast.success('Resident added successfully')
      setIsFormOpen(false)
      load()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add resident'
      if (message.toLowerCase().includes('no available bed')) {
        setResidentFormError('No available bed found in this PG. Add more beds or choose another PG.')
      } else if (message.toLowerCase().includes('profilephoto') || message.toLowerCase().includes('invalid url')) {
        setUploadError('Resident image URL is invalid. Upload an image or leave it blank.')
      } else {
        toast.error(message)
      }
    } finally {
      setIsSaving(false)
    }
  }

  const saveResidentEdit = async () => {
    if (!editingResident) {
      return
    }

    if (!editForm.fullName.trim() || !/^\d{10}$/.test(editForm.phone.trim()) || editForm.rent <= 0) {
      toast.warning('Fill valid resident name, 10-digit phone and monthly rent')
      return
    }

    setIsUpdatingResident(true)
    try {
      await updateOwnerResident(editingResident._id, {
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        joiningDate: editForm.joiningDate,
        rent: editForm.rent,
        deposit: editForm.deposit,
        amountPaid: editForm.amountPaid,
      })
      toast.success('Resident details updated')
      setEditingResident(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update resident')
    } finally {
      setIsUpdatingResident(false)
    }
  }

  const markResidentAsLeft = async () => {
    if (!leftResident) {
      return
    }

    if (leftForm.finalSettlementAmount < 0) {
      toast.warning('Closing amount cannot be negative')
      return
    }

    setIsMarkingLeft(true)
    try {
      await markOwnerResidentLeft(leftResident._id, {
        leavingDate: leftForm.leavingDate,
        finalSettlementAmount: leftForm.finalSettlementAmount,
        finalSettlementPaid: leftForm.finalSettlementPaid,
        reason: leftForm.reason.trim(),
        notes: leftForm.notes.trim(),
      })
      toast.success('Resident marked as left')
      setLeftResident(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to mark resident as left')
    } finally {
      setIsMarkingLeft(false)
    }
  }

  return (
    <>
      <div className="admin-hero-row">
        <div>
          <h2 className="page-heading">People in my PGs</h2>
          <p className="section-sub">Add residents and track paid, due, and final settlement amounts.</p>
        </div>
        <button type="button" className="btn btn-brand" onClick={openAddDialog} disabled={pgs.length === 0}>
          Add resident
        </button>
      </div>

      {pgs.length === 0 ? <p className="section-sub spaced-top">No PGs assigned yet. Ask admin to assign a PG first.</p> : null}

      <div className="form-grid two-col pg-form-grid spaced-top">
        <div className="form-field">
          <label>Search resident / phone / PG</label>
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Type resident name, phone, or PG"
          />
        </div>
        <div className="form-field">
          <label>Status filter</label>
          <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as 'all' | OwnerResident['status'])}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="left">Left</option>
            <option value="notice_period">Notice period</option>
            <option value="pending_verification">Pending verification</option>
            <option value="suspended">Suspended</option>
            <option value="invited">Invited</option>
          </select>
        </div>
        <div className="form-field">
          <label>Joining date from</label>
          <input type="date" value={joinedFrom} onChange={(event) => setJoinedFrom(event.target.value)} />
        </div>
        <div className="form-field">
          <label>Joining date to</label>
          <input type="date" value={joinedTo} onChange={(event) => setJoinedTo(event.target.value)} />
        </div>
      </div>

      <AppTable headers={['Resident', 'PG', 'Phone', 'Joining', 'Rent', 'Deposit', 'Paid', 'Due', 'Final settlement', 'Status', 'Actions']}>
        {filteredResidents.length === 0 ? (
          <tr>
            <td colSpan={11} className="empty-table-cell">
              <EmptyTableState />
            </td>
          </tr>
        ) : (
          filteredResidents.map((item) => (
            <tr key={item._id}>
              <td>
                <div className="table-user-cell">
                  {item.profilePhoto ? (
                    <img
                      src={item.profilePhoto}
                      alt={item.fullName}
                      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                      loading="lazy"
                    />
                  ) : (
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'inline-grid',
                        placeItems: 'center',
                        border: '1px solid var(--line)',
                        fontSize: 12,
                        color: 'var(--warm-gray)',
                      }}
                    >
                      {item.fullName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span>{item.fullName}</span>
                </div>
              </td>
              <td>{pgNameMap.get(item.pgId) ?? item.pgId}</td>
              <td>{item.phone}</td>
              <td>{new Date(item.joiningDate).toLocaleDateString()}</td>
              <td>{inr(item.rent)}</td>
              <td>{inr(item.deposit)}</td>
              <td>{inr(item.amountPaid ?? 0)}</td>
              <td>{inr(item.amountDue ?? 0)}</td>
              <td>
                {inr(item.finalSettlementAmount ?? 0)}
                {item.finalSettlementPaid ? ' (Paid)' : ''}
              </td>
              <td>
                <StatusBadge value={item.status} />
              </td>
              <td>
                <div className="table-action-row">
                  <button type="button" className="btn btn-line" onClick={() => setViewingResident(item)}>
                    View
                  </button>
                  <button
                    type="button"
                    className="btn btn-line"
                    onClick={() => openEditResidentDialog(item)}
                    disabled={item.status === 'left'}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-line"
                    onClick={() => openMarkLeftDialog(item)}
                    disabled={item.status === 'left'}
                  >
                    Left
                  </button>
                </div>
              </td>
            </tr>
          ))
        )}
      </AppTable>

      {viewingResident ? (
        <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Resident details">
          <div className="app-dialog">
            <div className="app-dialog-head">
              <div>
                <h3>{viewingResident.fullName}</h3>
                <p>{pgNameMap.get(viewingResident.pgId) ?? viewingResident.pgId}</p>
              </div>
              <button type="button" className="btn btn-line" onClick={() => setViewingResident(null)}>
                Close
              </button>
            </div>

            <div className="detail-grid-compact">
              <p><strong>Phone:</strong> {viewingResident.phone}</p>
              <p><strong>Joining:</strong> {new Date(viewingResident.joiningDate).toLocaleDateString()}</p>
              <p><strong>Rent:</strong> {inr(viewingResident.rent)}</p>
              <p><strong>Deposit:</strong> {inr(viewingResident.deposit)}</p>
              <p><strong>Amount paid:</strong> {inr(viewingResident.amountPaid ?? 0)}</p>
              <p><strong>Amount due:</strong> {inr(viewingResident.amountDue ?? 0)}</p>
              <p><strong>Final settlement:</strong> {inr(viewingResident.finalSettlementAmount ?? 0)}</p>
              <p><strong>Status:</strong> {viewingResident.status}</p>
            </div>
          </div>
        </div>
      ) : null}

      {editingResident ? (
        <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Edit resident">
          <div className="app-dialog app-dialog-wide">
            <div className="app-dialog-head">
              <div>
                <h3>Edit resident</h3>
                <p>Update resident details and payment information.</p>
              </div>
              <button type="button" className="btn btn-line" onClick={() => setEditingResident(null)} disabled={isUpdatingResident}>
                Close
              </button>
            </div>

            <div className="form-grid two-col pg-form-grid">
              <div className="form-field">
                <label>Resident name *</label>
                <input value={editForm.fullName} onChange={(event) => setEditForm((current) => ({ ...current, fullName: event.target.value }))} />
              </div>
              <div className="form-field">
                <label>Phone *</label>
                <input
                  value={editForm.phone}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, '').slice(0, 10) }))}
                />
              </div>
              <div className="form-field">
                <label>Joining date</label>
                <input type="date" value={editForm.joiningDate} onChange={(event) => setEditForm((current) => ({ ...current, joiningDate: event.target.value }))} />
              </div>
              <div className="form-field">
                <label>Monthly rent *</label>
                <input
                  type="number"
                  value={toNumberValue(editForm.rent)}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) => setEditForm((current) => ({ ...current, rent: parseNumberInput(event.target.value) }))}
                />
              </div>
              <div className="form-field">
                <label>Deposit</label>
                <input
                  type="number"
                  value={toNumberValue(editForm.deposit)}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) => setEditForm((current) => ({ ...current, deposit: parseNumberInput(event.target.value) }))}
                />
              </div>
              <div className="form-field">
                <label>Amount paid by resident</label>
                <input
                  type="number"
                  value={toNumberValue(editForm.amountPaid)}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) => setEditForm((current) => ({ ...current, amountPaid: parseNumberInput(event.target.value) }))}
                />
              </div>
            </div>

            <div className="pg-form-actions">
              <button type="button" className="btn btn-line" onClick={() => setEditingResident(null)} disabled={isUpdatingResident}>
                Cancel
              </button>
              <button type="button" className="btn btn-brand" onClick={saveResidentEdit} disabled={isUpdatingResident}>
                {isUpdatingResident ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {leftResident ? (
        <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Mark resident left">
          <div className="app-dialog app-dialog-wide">
            <div className="app-dialog-head">
              <div>
                <h3>Mark resident as left</h3>
                <p>Add closing amount paid by owner before closing resident stay.</p>
              </div>
              <button type="button" className="btn btn-line" onClick={() => setLeftResident(null)} disabled={isMarkingLeft}>
                Close
              </button>
            </div>

            <div className="form-grid two-col pg-form-grid">
              <div className="form-field">
                <label>Resident</label>
                <input value={leftResident.fullName} readOnly />
              </div>
              <div className="form-field">
                <label>Leaving date *</label>
                <input
                  type="date"
                  value={leftForm.leavingDate}
                  onChange={(event) => setLeftForm((current) => ({ ...current, leavingDate: event.target.value }))}
                />
              </div>
              <div className="form-field">
                <label>Closing amount owner is paying *</label>
                <input
                  type="number"
                  value={toNumberValue(leftForm.finalSettlementAmount)}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) => setLeftForm((current) => ({ ...current, finalSettlementAmount: parseNumberInput(event.target.value) }))}
                />
              </div>
              <div className="form-field">
                <label>Payment settled</label>
                <select
                  value={leftForm.finalSettlementPaid ? 'yes' : 'no'}
                  onChange={(event) => setLeftForm((current) => ({ ...current, finalSettlementPaid: event.target.value === 'yes' }))}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Reason</label>
                <textarea rows={2} value={leftForm.reason} onChange={(event) => setLeftForm((current) => ({ ...current, reason: event.target.value }))} />
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label>Notes</label>
                <textarea rows={2} value={leftForm.notes} onChange={(event) => setLeftForm((current) => ({ ...current, notes: event.target.value }))} />
              </div>
            </div>

            <div className="pg-form-actions">
              <button type="button" className="btn btn-line" onClick={() => setLeftResident(null)} disabled={isMarkingLeft}>
                Cancel
              </button>
              <button type="button" className="btn btn-brand" onClick={markResidentAsLeft} disabled={isMarkingLeft}>
                {isMarkingLeft ? 'Saving...' : 'Confirm left'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isFormOpen ? (
        <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Add resident">
          <div className="app-dialog app-dialog-wide">
            <div className="app-dialog-head">
              <div>
                <h3>Add resident</h3>
                <p>Fill resident and payment details for this PG.</p>
              </div>
              <button type="button" className="btn btn-line" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                Close
              </button>
            </div>

            <div className="form-grid two-col pg-form-grid">
              <div className="form-field">
                <label>PG *</label>
                <select value={form.pgId} onChange={(event) => updateResidentField('pgId', event.target.value)}>
                  {pgs.map((pg) => (
                    <option key={pg._id} value={pg._id}>{pg.name}</option>
                  ))}
                </select>
                {residentErrors.pgId ? <small className="upload-error-text">{residentErrors.pgId}</small> : null}
                {selectedPg ? (
                  <small className="section-sub">
                    Capacity target: {selectedPgConfiguredCapacity} · Live available bed records: {selectedPgAssignableBeds ?? 'N/A'}
                  </small>
                ) : null}
                {selectedPgHasNoBeds && selectedPgConfiguredCapacity > 0 ? (
                  <small className="section-sub">
                    Capacity is set, but no bed record is currently in available/vacant/cleaning state for assignment.
                  </small>
                ) : null}
                {selectedPgHasNoBeds ? <small className="upload-error-text">No beds available in this PG.</small> : null}
                {selectedPgHasNoBeds ? (
                  <div>
                    <button
                      type="button"
                      className="btn btn-line"
                      onClick={initializeBeds}
                      disabled={isInitializingBeds || isSaving}
                    >
                      {isInitializingBeds ? 'Initializing beds...' : 'Initialize beds for this PG'}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="form-field">
                <label>Resident name *</label>
                <input value={form.fullName} onChange={(event) => updateResidentField('fullName', event.target.value)} />
                {residentErrors.fullName ? <small className="upload-error-text">{residentErrors.fullName}</small> : null}
              </div>
              <div className="form-field">
                <label>Phone *</label>
                <input
                  value={form.phone}
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  onChange={(event) => updateResidentField('phone', event.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="10-digit mobile"
                />
                {residentErrors.phone ? <small className="upload-error-text">{residentErrors.phone}</small> : null}
              </div>
              <div className="form-field">
                <label>Joining date</label>
                <input type="date" value={form.joiningDate} onChange={(event) => updateResidentField('joiningDate', event.target.value)} />
              </div>
              <div className="form-field">
                <label>Monthly rent *</label>
                <input
                  type="number"
                  value={toNumberValue(form.rent)}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) => updateResidentField('rent', parseNumberInput(event.target.value))}
                />
                {residentErrors.rent ? <small className="upload-error-text">{residentErrors.rent}</small> : null}
              </div>
              <div className="form-field">
                <label>Deposit</label>
                <input
                  type="number"
                  value={toNumberValue(form.deposit)}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) => updateResidentField('deposit', parseNumberInput(event.target.value))}
                />
              </div>
              <div className="form-field">
                <label>Amount paid by resident</label>
                <input
                  type="number"
                  value={toNumberValue(form.amountPaid)}
                  onWheel={(event) => event.currentTarget.blur()}
                  onChange={(event) => updateResidentField('amountPaid', parseNumberInput(event.target.value))}
                />
              </div>
              <div className="form-field">
                <label>Resident image (optional)</label>
                <div className="image-upload-row">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      setSelectedImageFile(event.target.files?.[0] ?? null)
                      setUploadError('')
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-line"
                    onClick={uploadResidentPhoto}
                    disabled={!selectedImageFile || isUploadingImage}
                  >
                    {isUploadingImage ? 'Uploading...' : 'Upload image'}
                  </button>
                </div>
                {uploadError ? <small className="upload-error-text">{uploadError}</small> : null}
                {form.profilePhoto ? <small className="section-sub">Image uploaded successfully.</small> : null}
              </div>
            </div>

            {residentFormError ? <p className="upload-error-text">{residentFormError}</p> : null}

            <div className="pg-form-actions">
              <button type="button" className="btn btn-line" onClick={() => setIsFormOpen(false)} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className="btn btn-brand" onClick={addResident} disabled={isSaving || selectedPgHasNoBeds}>
                {isSaving ? 'Adding...' : 'Add resident'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
