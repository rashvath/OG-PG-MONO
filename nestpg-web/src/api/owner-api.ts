import type { AxiosRequestConfig } from 'axios'

import { apiClient, toApiError } from './http'

async function api<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await apiClient.request<T>(config)
    return response.data
  } catch (error) {
    throw new Error(toApiError(error))
  }
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
  pgId: string
  rent: number
  deposit: number
  amountPaid?: number
  amountDue?: number
  paymentStatus: 'pending' | 'partial' | 'paid'
  status: 'invited' | 'pending_verification' | 'active' | 'notice_period' | 'left' | 'suspended'
  joiningDate: string
  actualExitDate?: string
  finalSettlementAmount?: number
  finalSettlementPaid?: boolean
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
    roomTypes: Array<{ sharing: 'Single' | 'Double' | 'Triple'; rent: number; deposit: number }>
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

export async function createOwnerResident(payload: {
  pgId: string
  roomId?: string
  bedId?: string
  fullName: string
  profilePhoto?: string
  phone: string
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
  try {
    const response = await apiClient.get<Blob>(`/owner/balance-sheets/${id}/export`, {
      responseType: 'blob',
    })
    return response.data
  } catch (error) {
    throw new Error(toApiError(error))
  }
}
