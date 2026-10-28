const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1'

type ErrorEnvelope = {
  message?: string | { formErrors?: string[]; fieldErrors?: Record<string, string[] | string> }
  error?: string
}

function extractErrorMessage(data: ErrorEnvelope): string {
  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message
  }

  if (data.message && typeof data.message === 'object') {
    const formError = data.message.formErrors?.find((item) => item && item.trim().length > 0)
    if (formError) {
      return formError
    }

    const entries = Object.entries(data.message.fieldErrors ?? {})
    for (const [field, value] of entries) {
      if (Array.isArray(value) && value.length > 0 && value[0]) {
        return `${field}: ${value[0]}`
      }
      if (typeof value === 'string' && value.trim()) {
        return `${field}: ${value}`
      }
    }
  }

  if (typeof data.error === 'string' && data.error.trim()) {
    return data.error
  }

  return 'Request failed'
}

function getToken() {
  return localStorage.getItem('nestpg-token')
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })

  const data = (await response.json()) as T & ErrorEnvelope
  if (!response.ok) {
    throw new Error(extractErrorMessage(data))
  }

  return data
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
  }>('/owner/dashboard/summary')
}

export async function getOwnerPgs() {
  return api<{ items: OwnerPg[] }>('/owner/pgs')
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

  return api(`/owner/pgs/${pgId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function getOwnerEnquiries() {
  return api<{ items: OwnerEnquiry[] }>('/owner/enquiries')
}

export async function getOwnerResidents(params?: { pgId?: string; status?: string }) {
  const query = new URLSearchParams()
  if (params?.pgId) {
    query.set('pgId', params.pgId)
  }
  if (params?.status) {
    query.set('status', params.status)
  }

  return api<{ items: OwnerResident[] }>(`/owner/residents${query.size ? `?${query.toString()}` : ''}`)
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

  return api('/owner/residents', {
    method: 'POST',
    body: JSON.stringify(body),
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
  return api<OwnerResident>(`/owner/residents/${residentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
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
  return api<OwnerResident>(`/owner/residents/${residentId}/mark-left`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function initializeOwnerPgBeds(pgId: string) {
  return api<{ message: string; createdRooms: number; createdBeds: number; totalBeds: number; availableBeds: number }>(
    `/owner/pgs/${pgId}/initialize-beds`,
    {
      method: 'POST',
    },
  )
}
