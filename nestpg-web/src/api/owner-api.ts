import { apiRequest } from './api'

async function api<T>(config: Parameters<typeof apiRequest<T>>[0]): Promise<T> {
  return apiRequest<T>(config)
}

export type OwnerPg = {
  _id: string
  name: string
  address: string
  area: string
  pincode?: string
  mapsLocation?: string
  latitude?: number
  longitude?: number
  description?: string
  baseRent: number
  deposit?: number
  maintenance?: number
  electricityRules?: string
  foodCharges?: number
  otherCharges?: number
  totalRooms?: number
  totalBeds?: number
  availableBeds?: number
  occupiedBeds?: number
  pgType?: string
  totalFloors?: number
  gender: 'Men' | 'Women' | 'Co-ed'
  amenities: string[]
  weeklyMenu?: Array<{ day: string; items: string[] }>
  photos: string[]
  foodAvailable?: boolean
  curfew?: string
  securityInfo?: string
  contactName?: string
  contactPhone?: string
  status: 'pending' | 'live' | 'suspended' | 'rejected' | 'unassigned'
}

export type OwnerEnquiry = {
  _id: string
  name: string
  phone: string
  status: 'new' | 'contacted' | 'closed'
  createdAt: string
  listingId?: { _id?: string; name?: string } | string
}

export type OwnerResident = {
  _id: string
  fullName: string
  profilePhoto?: string
  phone: string
  email?: string
  pgId: string
  roomId?: string
  bedId?: string
  rent: number
  deposit: number
  amountPaid?: number
  amountDue?: number
  paymentStatus: 'pending' | 'partial' | 'paid'
  status: 'invited' | 'pending_verification' | 'active' | 'notice_period' | 'left' | 'suspended'
  joiningDate: string
  expectedExitDate?: string
  actualExitDate?: string
  finalSettlementAmount?: number
  finalSettlementPaid?: boolean
}

export type BedStatus = 'vacant' | 'occupied' | 'reserved' | 'maintenance'

export type OwnerFloor = {
  _id: string
  pgId: string
  name: string
  level: number
  sortOrder: number
  layoutMode?: 'grid' | 'custom'
  gridColumns?: number
  isActive: boolean
}

export type OwnerBed = {
  _id: string
  pgId: string
  roomId: string
  bedLabel: string
  bedNumber?: number
  status: BedStatus
  monthlyRent?: number
  maintenanceReason?: string
  reservedForName?: string
  reservedForPhone?: string
  reservedAt?: string
  expectedMoveInDate?: string
  expectedVacatingDate?: string
}

export type OwnerRoom = {
  _id: string
  pgId: string
  floorId?: string
  floorNumber: number
  floorName?: string
  roomNumber: string
  roomType: 'Single Sharing' | 'Double Sharing' | 'Triple Sharing' | 'Four Sharing' | 'Custom'
  totalBeds: number
  occupiedBeds: number
  monthlyRent?: number
  bathroomType?: 'attached' | 'common'
  acType?: 'ac' | 'non-ac'
  description?: string
  status?: 'active' | 'maintenance' | 'inactive'
  customOrder?: number
  beds: OwnerBed[]
  occupancy: {
    occupied: number
    vacant: number
    reserved: number
    maintenance: number
    total: number
  }
}

export type OwnerInventoryStats = {
  totalFloors: number
  totalRooms: number
  totalBeds: number
  availableBeds: number
  occupiedBeds: number
  reservedBeds: number
  maintenanceBeds: number
  occupancyPercentage: number
}

export type OwnerLedgerEntry = {
  _id: string
  ownerId: string
  pgId?: string
  entryType: 'income' | 'expense'
  category: string
  amount: number
  entryDate: string
  notes?: string
  residentName?: string
  source?: 'individual' | 'bulk'
  createdAt: string
  updatedAt: string
}

export type OwnerBalanceSheet = {
  _id: string
  ownerId: string
  pgId?: { _id?: string; name?: string; area?: string } | string
  title: string
  periodStart: string
  periodEnd: string
  totalIncome: number
  totalExpense: number
  netBalance: number
  entriesCount: number
  incomeByCategory: Array<{ category: string; amount: number }>
  expenseByCategory: Array<{ category: string; amount: number }>
  notes?: string
  createdAt: string
  updatedAt: string
  lastGeneratedAt: string
}

export type OwnerDocument = {
  _id: string
  ownerId: string
  pgId: { _id?: string; name?: string; area?: string } | string
  title: string
  documentType: string
  imageUrl: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export async function getOwnerSummary() {
  return api<{
    activeListings: number
    enquiries: number
    totalBeds: number
    occupiedBeds: number
    availableBeds: number
    activeResidents: number
    leftResidents: number
    occupancy: number
    averageRating: number
    weeklyEnquiries: Array<{ label: string; count: number }>
  }>({ url: '/owner/dashboard/summary' })
}

export async function getOwnerPgs() {
  return api<{ items: OwnerPg[] }>({ url: '/owner/pgs' })
}

export async function updateOwnerPg(
  pgId: string,
  payload: {
    name: string
    address: string
    area: string
    pincode?: string
    mapsLocation?: string
    latitude?: number
    longitude?: number
    description?: string
    baseRent: number
    deposit?: number
    maintenance?: number
    electricityRules?: string
    foodCharges?: number
    otherCharges?: number
    totalRooms: number
    totalBeds: number
    pgType?: string
    totalFloors?: number
    gender: 'Men' | 'Women' | 'Co-ed'
    amenities: string[]
    weeklyMenu?: Array<{ day: string; items: string[] }>
    photos: string[]
    foodAvailable?: boolean
    curfew?: string
    securityInfo?: string
    contactName?: string
    contactPhone?: string
    roomTypes: Array<{ sharing: 'Single' | 'Double' | 'Triple' | 'Four' | 'Custom'; rent: number; deposit: number }>
  },
) {
  const body: Record<string, unknown> = { ...payload }
  if (!payload.photos || payload.photos.length === 0) {
    delete body.photos
  }

  return api({
    url: `/owner/pgs/${pgId}`,
    method: 'PATCH',
    data: body,
  })
}

export async function getOwnerEnquiries() {
  return api<{ items: OwnerEnquiry[] }>({ url: '/owner/enquiries' })
}

export async function getOwnerResidents(params?: { pgId?: string; status?: string }) {
  const query = new URLSearchParams()
  if (params?.pgId) {
    query.set('pgId', params.pgId)
  }
  if (params?.status) {
    query.set('status', params.status)
  }

  return api<{ items: OwnerResident[] }>({
    url: `/owner/residents${query.size ? `?${query.toString()}` : ''}`,
  })
}

export async function getOwnerInventory(
  pgId: string,
  params?: {
    floorId?: string
    bedStatus?: BedStatus
    roomType?: OwnerRoom['roomType']
    search?: string
    onlyWithAvailableBeds?: boolean
  },
) {
  const query = new URLSearchParams()
  if (params?.floorId) query.set('floorId', params.floorId)
  if (params?.bedStatus) query.set('bedStatus', params.bedStatus)
  if (params?.roomType) query.set('roomType', params.roomType)
  if (params?.search) query.set('search', params.search)
  if (params?.onlyWithAvailableBeds) query.set('onlyWithAvailableBeds', 'true')

  return api<{ stats: OwnerInventoryStats; floors: OwnerFloor[]; rooms: OwnerRoom[] }>({
    url: `/owner/pgs/${pgId}/inventory${query.size ? `?${query.toString()}` : ''}`,
  })
}

export async function createOwnerFloor(
  pgId: string,
  payload: { name: string; level?: number; sortOrder?: number; layoutMode?: 'grid' | 'custom'; gridColumns?: number },
) {
  return api<OwnerFloor>({
    url: `/owner/pgs/${pgId}/floors`,
    method: 'POST',
    data: payload,
  })
}

export async function updateOwnerFloor(
  pgId: string,
  floorId: string,
  payload: { name?: string; level?: number; sortOrder?: number; layoutMode?: 'grid' | 'custom'; gridColumns?: number; isActive?: boolean },
) {
  return api<OwnerFloor>({
    url: `/owner/pgs/${pgId}/floors/${floorId}`,
    method: 'PATCH',
    data: payload,
  })
}

export async function deleteOwnerFloor(pgId: string, floorId: string) {
  return api<{ message: string }>({
    url: `/owner/pgs/${pgId}/floors/${floorId}`,
    method: 'DELETE',
  })
}

export async function createOwnerRoom(
  pgId: string,
  payload: {
    floorId: string
    roomNumber: string
    roomType: OwnerRoom['roomType']
    totalBedCapacity: number
    monthlyRent: number
    bathroomType: 'attached' | 'common'
    acType: 'ac' | 'non-ac'
    description?: string
    status?: 'active' | 'maintenance' | 'inactive'
    customOrder?: number
  },
) {
  return api({
    url: `/owner/pgs/${pgId}/rooms`,
    method: 'POST',
    data: payload,
  })
}

export async function updateOwnerRoom(
  pgId: string,
  roomId: string,
  payload: {
    floorId?: string
    roomNumber?: string
    roomType?: OwnerRoom['roomType']
    totalBedCapacity?: number
    monthlyRent?: number
    bathroomType?: 'attached' | 'common'
    acType?: 'ac' | 'non-ac'
    description?: string
    status?: 'active' | 'maintenance' | 'inactive'
    customOrder?: number
  },
) {
  return api({
    url: `/owner/pgs/${pgId}/rooms/${roomId}`,
    method: 'PATCH',
    data: payload,
  })
}

export async function deleteOwnerRoom(pgId: string, roomId: string) {
  return api<{ message: string }>({
    url: `/owner/pgs/${pgId}/rooms/${roomId}`,
    method: 'DELETE',
  })
}

export async function updateOwnerBedStatus(
  pgId: string,
  bedId: string,
  payload: {
    status: BedStatus
    maintenanceReason?: string
    reservedForName?: string
    reservedForPhone?: string
    expectedMoveInDate?: string
    expectedVacatingDate?: string
    monthlyRent?: number
  },
) {
  return api<OwnerBed>({
    url: `/owner/pgs/${pgId}/beds/${bedId}/status`,
    method: 'PATCH',
    data: payload,
  })
}

export async function assignTenantToOwnerBed(
  pgId: string,
  bedId: string,
  payload: {
    fullName: string
    phone: string
    email?: string
    joiningDate: string
    expectedExitDate?: string
    rent: number
    deposit?: number
    amountPaid?: number
    paymentStatus?: 'pending' | 'partial' | 'paid'
  },
) {
  return api<OwnerResident>({
    url: `/owner/pgs/${pgId}/beds/${bedId}/assign-tenant`,
    method: 'POST',
    data: payload,
  })
}

export async function vacateOwnerBed(
  pgId: string,
  bedId: string,
  payload: {
    leavingDate: string
    reason?: string
    finalSettlementAmount: number
    finalSettlementPaid: boolean
    notes?: string
    finalRoomCondition?: string
  },
) {
  return api<OwnerResident>({
    url: `/owner/pgs/${pgId}/beds/${bedId}/vacate`,
    method: 'POST',
    data: payload,
  })
}

export async function createOwnerResident(payload: {
  pgId: string
  roomId?: string
  bedId?: string
  fullName: string
  profilePhoto?: string
  phone: string
  email?: string
  joiningDate: string
  rent: number
  deposit: number
  amountPaid: number
}) {
  const body: Record<string, unknown> = { ...payload }
  if (!payload.profilePhoto || payload.profilePhoto.trim().length === 0) {
    delete body.profilePhoto
  }

  return api({
    url: '/owner/residents',
    method: 'POST',
    data: body,
  })
}

export async function updateOwnerResident(
  residentId: string,
  payload: {
    fullName: string
    phone: string
    joiningDate: string
    rent: number
    deposit: number
    amountPaid: number
  },
) {
  return api<OwnerResident>({
    url: `/owner/residents/${residentId}`,
    method: 'PATCH',
    data: payload,
  })
}

export async function moveOwnerResident(
  residentId: string,
  payload: {
    pgId: string
    roomId: string
    bedId: string
  },
) {
  return api<OwnerResident>({
    url: `/owner/residents/${residentId}/move`,
    method: 'POST',
    data: payload,
  })
}

export async function markOwnerResidentLeft(
  residentId: string,
  payload: {
    leavingDate: string
    finalSettlementAmount: number
    finalSettlementPaid: boolean
    reason?: string
    notes?: string
  },
) {
  return api<OwnerResident>({
    url: `/owner/residents/${residentId}/mark-left`,
    method: 'POST',
    data: payload,
  })
}

export async function initializeOwnerPgBeds(pgId: string) {
  return api<{ message: string; createdRooms: number; createdBeds: number; totalBeds: number; availableBeds: number }>({
    url: `/owner/pgs/${pgId}/initialize-beds`,
    method: 'POST',
  })
}

export async function createOwnerLedgerEntry(payload: {
  pgId?: string
  entryType: 'income' | 'expense'
  category: string
  amount: number
  entryDate: string
  notes?: string
  residentName?: string
}) {
  return api<OwnerLedgerEntry>({
    url: '/owner/ledger/entries',
    method: 'POST',
    data: payload,
  })
}

export async function createOwnerLedgerEntriesBulk(entries: Array<{
  pgId?: string
  entryType: 'income' | 'expense'
  category: string
  amount: number
  entryDate: string
  notes?: string
  residentName?: string
}>) {
  return api<{ insertedCount: number; items: OwnerLedgerEntry[] }>({
    url: '/owner/ledger/entries/bulk',
    method: 'POST',
    data: { entries },
  })
}

export async function getOwnerLedgerEntries(params?: {
  pgId?: string
  entryType?: 'income' | 'expense'
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}) {
  const query = new URLSearchParams()
  if (params?.pgId) query.set('pgId', params.pgId)
  if (params?.entryType) query.set('entryType', params.entryType)
  if (params?.startDate) query.set('startDate', params.startDate)
  if (params?.endDate) query.set('endDate', params.endDate)
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))

  return api<{ items: OwnerLedgerEntry[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } }>({
    url: `/owner/ledger/entries${query.size ? `?${query.toString()}` : ''}`,
  })
}

export async function deleteOwnerLedgerEntry(entryId: string) {
  return api<{ message: string }>({
    url: `/owner/ledger/entries/${entryId}`,
    method: 'DELETE',
  })
}

export async function generateOwnerBalanceSheet(payload: {
  title?: string
  pgId?: string
  periodStart: string
  periodEnd: string
  notes?: string
}) {
  return api<{
    title: string
    pgId?: string | null
    notes?: string
    periodStart: string
    periodEnd: string
    totalIncome: number
    totalExpense: number
    netBalance: number
    entriesCount: number
    incomeByCategory: Array<{ category: string; amount: number }>
    expenseByCategory: Array<{ category: string; amount: number }>
    lastGeneratedAt: string
  }>({
    url: '/owner/balance-sheets/generate',
    method: 'POST',
    data: payload,
  })
}

export async function saveOwnerBalanceSheet(payload: {
  title: string
  pgId?: string
  periodStart: string
  periodEnd: string
  notes?: string
}) {
  return api<OwnerBalanceSheet>({
    url: '/owner/balance-sheets',
    method: 'POST',
    data: payload,
  })
}

export async function getOwnerBalanceSheets(params?: { pgId?: string; page?: number; limit?: number }) {
  const query = new URLSearchParams()
  if (params?.pgId) query.set('pgId', params.pgId)
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))

  return api<{ items: OwnerBalanceSheet[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } }>({
    url: `/owner/balance-sheets${query.size ? `?${query.toString()}` : ''}`,
  })
}

export async function deleteOwnerBalanceSheet(id: string) {
  return api<{ message: string }>({
    url: `/owner/balance-sheets/${id}`,
    method: 'DELETE',
  })
}

export async function exportOwnerBalanceSheetCsv(id: string) {
  return apiRequest<Blob>({
    url: `/owner/balance-sheets/${id}/export`,
    method: 'GET',
    responseType: 'blob',
  })
}

export async function createOwnerDocument(payload: {
  pgId: string
  title: string
  documentType: string
  imageUrl: string
  notes?: string
}) {
  return api<OwnerDocument>({
    url: '/owner/documents',
    method: 'POST',
    data: payload,
  })
}

export async function getOwnerDocuments(params?: {
  pgId?: string
  documentType?: string
  search?: string
  page?: number
  limit?: number
}) {
  const query = new URLSearchParams()
  if (params?.pgId) query.set('pgId', params.pgId)
  if (params?.documentType) query.set('documentType', params.documentType)
  if (params?.search) query.set('search', params.search)
  if (params?.page) query.set('page', String(params.page))
  if (params?.limit) query.set('limit', String(params.limit))

  return api<{ items: OwnerDocument[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } }>({
    url: `/owner/documents${query.size ? `?${query.toString()}` : ''}`,
  })
}

export async function deleteOwnerDocument(id: string) {
  return api<{ message: string }>({
    url: `/owner/documents/${id}`,
    method: 'DELETE',
  })
}
