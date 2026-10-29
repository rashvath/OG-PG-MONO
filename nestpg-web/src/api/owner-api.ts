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
