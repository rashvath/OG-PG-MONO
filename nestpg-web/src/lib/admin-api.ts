const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api/v1'

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

  const data = (await response.json()) as T & { message?: string }
  if (!response.ok) {
    throw new Error(data.message ?? 'Request failed')
  }

  return data
}

export type AdminPg = {
  _id: string
  name: string
  address: string
  area: string
  mapsLocation?: string
  latitude?: number
  longitude?: number
  baseRent: number
  totalRooms?: number
  totalBeds?: number
  ownerId?: string
  gender?: 'Men' | 'Women' | 'Co-ed'
  amenities?: string[]
  weeklyMenu?: Array<{ day: string; items: string[] }>
  photos?: string[]
  status: string
  owner?: { name?: string; email?: string } | null
}

export type AdminOwner = {
  _id: string
  name: string
  email: string
  phone: string
  status: string
  ownerStatus: 'pending' | 'approved' | 'rejected' | 'suspended'
  pgCount: number
}

export type AdminUser = {
  _id: string
  name: string
  email: string
  status: 'active' | 'blocked'
}

export type AdminEnquiry = {
  _id: string
  name: string
  phone: string
  status: 'new' | 'contacted' | 'closed'
  createdAt: string
  listingId?: { _id?: string; name?: string } | string
}

export type OwnerApplication = {
  _id: string
  name: string
  email: string
  mobile: string
  pgName: string
  area: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
}

export type AdminResident = {
  _id: string
  fullName: string
  phone: string
  rent: number
  deposit: number
  amountPaid?: number
  amountDue?: number
  status: 'invited' | 'pending_verification' | 'active' | 'notice_period' | 'left' | 'suspended'
  joiningDate: string
  actualExitDate?: string
  finalSettlementAmount?: number
  finalSettlementPaid?: boolean
  ownerId?: { _id?: string; name?: string; email?: string } | string
  pgId?: { _id?: string; name?: string; area?: string } | string
}

export async function getAdminSummary() {
  return api<{ pgs: number; owners: number; users: number; pending: number }>('/admin/dashboard/summary')
}

export async function getAdminPgs() {
  return api<{ items: AdminPg[] }>('/admin/pgs')
}

export async function createAdminPg(payload: {
  name: string
  address: string
  area: string
  mapsLocation?: string
  latitude?: number
  longitude?: number
  baseRent: number
  totalRooms?: number
  totalBeds?: number
  gender: 'Men' | 'Women' | 'Co-ed'
  amenities?: string[]
  weeklyMenu?: Array<{ day: string; items: string[] }>
  photos?: string[]
  status?: 'pending' | 'live' | 'suspended' | 'rejected' | 'unassigned'
  ownerId?: string
}) {
  return api('/admin/pgs', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      description: '',
      amenities: payload.amenities ?? [],
      photos: payload.photos ?? [],
      contactName: '',
      contactPhone: '0000000000',
      availability: payload.totalBeds ?? 0,
      totalRooms: payload.totalRooms ?? 0,
      totalBeds: payload.totalBeds ?? 0,
      roomTypes: [
        { sharing: 'Single', rent: Math.round(payload.baseRent * 1.55), deposit: Math.round(payload.baseRent * 3.1) },
        { sharing: 'Double', rent: Math.round(payload.baseRent * 1.2), deposit: Math.round(payload.baseRent * 2.4) },
        { sharing: 'Triple', rent: payload.baseRent, deposit: payload.baseRent * 2 },
      ],
    }),
  })
}

export async function updateAdminPg(
  pgId: string,
  payload: {
    name: string
    address: string
    area: string
    mapsLocation?: string
    latitude?: number
    longitude?: number
    baseRent: number
    totalRooms: number
    totalBeds: number
    gender: 'Men' | 'Women' | 'Co-ed'
    amenities: string[]
    weeklyMenu?: Array<{ day: string; items: string[] }>
    photos: string[]
  },
) {
  const body: Record<string, unknown> = {
    ...payload,
    availability: payload.totalBeds,
    roomTypes: [
      { sharing: 'Single', rent: Math.round(payload.baseRent * 1.55), deposit: Math.round(payload.baseRent * 3.1) },
      { sharing: 'Double', rent: Math.round(payload.baseRent * 1.2), deposit: Math.round(payload.baseRent * 2.4) },
      { sharing: 'Triple', rent: payload.baseRent, deposit: payload.baseRent * 2 },
    ],
  }

  if (!payload.photos || payload.photos.length === 0) {
    delete body.photos
  }

  return api(`/admin/pgs/${pgId}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function setPgStatus(pgId: string, status: 'pending' | 'live' | 'suspended' | 'rejected' | 'unassigned') {
  return api(`/admin/listings/${pgId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function getAdminOwners() {
  return api<{ items: AdminOwner[] }>('/admin/owners')
}

export async function createAdminOwner(payload: {
  name: string
  email: string
  phone: string
  temporaryPassword: string
  assignedPgIds: string[]
}) {
  return api('/admin/owners', {
    method: 'POST',
    body: JSON.stringify({ ...payload, status: 'approved' }),
  })
}

export async function assignPgsToOwner(ownerId: string, pgIds: string[]) {
  return api(`/admin/owners/${ownerId}/assign-pgs`, {
    method: 'POST',
    body: JSON.stringify({ pgIds }),
  })
}

export async function setOwnerStatus(ownerId: string, status: 'active' | 'blocked') {
  return api(`/admin/owners/${ownerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function deleteOwner(ownerId: string) {
  return api(`/admin/owners/${ownerId}`, {
    method: 'DELETE',
  })
}

export async function getAdminUsers() {
  return api<{ items: AdminUser[] }>('/admin/users')
}

export async function getAdminEnquiries() {
  return api<{ items: AdminEnquiry[] }>('/admin/enquiries')
}

export async function setUserStatus(userId: string, status: 'active' | 'blocked') {
  return api(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function getOwnerApplications() {
  return api<{ items: OwnerApplication[] }>('/admin/owner-applications?status=pending')
}

export async function approveOwnerApplication(id: string) {
  return api(`/admin/owner-applications/${id}/approve`, { method: 'POST' })
}

export async function rejectOwnerApplication(id: string) {
  return api(`/admin/owner-applications/${id}/reject`, { method: 'POST' })
}

export async function getAdminResidents(params?: { status?: string; ownerId?: string; pgId?: string }) {
  const query = new URLSearchParams()
  if (params?.status) {
    query.set('status', params.status)
  }
  if (params?.ownerId) {
    query.set('ownerId', params.ownerId)
  }
  if (params?.pgId) {
    query.set('pgId', params.pgId)
  }

  return api<{ items: AdminResident[] }>(`/admin/residents${query.size ? `?${query.toString()}` : ''}`)
}

export async function markResidentLeftByAdmin(
  residentId: string,
  payload: {
    leavingDate: string
    reason?: string
    finalSettlementAmount: number
    finalSettlementPaid: boolean
    notes?: string
    finalRoomCondition?: string
  },
) {
  return api(`/admin/residents/${residentId}/mark-left`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
