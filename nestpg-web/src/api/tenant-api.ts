import { apiRequest } from './api'

async function api<T>(config: Parameters<typeof apiRequest<T>>[0]): Promise<T> {
  return apiRequest<T>(config)
}

export type TenantComplaint = {
  _id: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'rejected'
  resolutionNote?: string
  createdAt: string
}

export type TenantPaymentProof = {
  _id: string
  amount: number
  paidForMonth?: string
  transactionRef?: string
  screenshotUrl: string
  notes?: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  createdAt: string
}

export type TenantAbsenceRequest = {
  _id: string
  fromDate: string
  toDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  createdAt: string
}

export type TenantProfileUpdateRequest = {
  _id: string
  requestedFields?: Array<'name' | 'phone' | 'email' | 'profileAddress' | 'emergencyContactName' | 'emergencyContactPhone'>
  currentValues?: {
    name?: string
    phone?: string
    email?: string
    profileAddress?: string
    emergencyContactName?: string
    emergencyContactPhone?: string
  }
  proposedValues?: {
    name?: string
    phone?: string
    email?: string
    profileAddress?: string
    emergencyContactName?: string
    emergencyContactPhone?: string
  }
  requestedName?: string
  requestedPhone?: string
  requestedEmail?: string
  requestedEmergencyContact?: string
  requestedEmergencyPhone?: string
  requestedAddress?: string
  notes?: string
  status: 'pending' | 'approved' | 'rejected'
  rejectionReason?: string
  createdAt: string
}

export type TenantSelf = {
  tenant: {
    _id: string
    name: string
    email: string
    phone: string
    profileAddress?: string
    emergencyContactName?: string
    emergencyContactPhone?: string
    tenantApprovalStatus: 'none' | 'pending' | 'approved' | 'rejected'
    tenantApprovalReason?: string
  }
  pg?: {
    _id?: string
    name?: string
    area?: string
    address?: string
  } | null
}

export async function getTenantSelf() {
  return api<TenantSelf>({ url: '/tenant/me' })
}

export async function getTenantComplaints() {
  return api<{ items: TenantComplaint[] }>({ url: '/tenant/complaints' })
}

export async function createTenantComplaint(payload: { title: string; description: string }) {
  return api<TenantComplaint>({
    url: '/tenant/complaints',
    method: 'POST',
    data: payload,
  })
}

export async function getTenantPaymentProofs() {
  return api<{ items: TenantPaymentProof[] }>({ url: '/tenant/payment-proofs' })
}

export async function createTenantPaymentProof(payload: {
  amount: number
  paidForMonth?: string
  transactionRef?: string
  screenshotUrl: string
  notes?: string
}) {
  return api<TenantPaymentProof>({
    url: '/tenant/payment-proofs',
    method: 'POST',
    data: payload,
  })
}

export async function getTenantAbsenceRequests() {
  return api<{ items: TenantAbsenceRequest[] }>({ url: '/tenant/absences' })
}

export async function createTenantAbsenceRequest(payload: {
  fromDate: string
  toDate: string
  reason: string
}) {
  return api<TenantAbsenceRequest>({
    url: '/tenant/absences',
    method: 'POST',
    data: payload,
  })
}

export async function getTenantProfileUpdateRequests() {
  return api<{ items: TenantProfileUpdateRequest[] }>({ url: '/tenant/profile-update-requests' })
}

export async function createTenantProfileUpdateRequest(payload: {
  changes?: {
    name?: string
    phone?: string
    email?: string
    profileAddress?: string
    emergencyContactName?: string
    emergencyContactPhone?: string
  }
  notes?: string
}) {
  return api<TenantProfileUpdateRequest>({
    url: '/tenant/profile-update-requests',
    method: 'POST',
    data: payload,
  })
}

export async function getTenantPendingApprovals() {
  return api<{ items: Array<{ _id: string; name: string; email: string; phone: string; tenantPgId?: { _id?: string; name?: string; area?: string } | string }> }>({
    url: '/tenant/approvals',
  })
}

export async function reviewTenantApproval(tenantUserId: string, payload: { action: 'approve' | 'reject'; reason?: string }) {
  return api<{ message: string }>({
    url: `/tenant/approvals/${tenantUserId}`,
    method: 'PATCH',
    data: payload,
  })
}

export async function getTenantReviewComplaints() {
  return api<{ items: Array<TenantComplaint & { tenantUserId?: { name?: string; email?: string }; pgId?: { name?: string; area?: string } }> }>({
    url: '/tenant/review/complaints',
  })
}

export async function reviewTenantComplaint(id: string, payload: { status: 'in_progress' | 'resolved' | 'rejected'; resolutionNote?: string }) {
  return api<TenantComplaint>({
    url: `/tenant/review/complaints/${id}`,
    method: 'PATCH',
    data: payload,
  })
}

export async function getTenantReviewPaymentProofs() {
  return api<{ items: Array<TenantPaymentProof & { tenantUserId?: { name?: string; email?: string }; pgId?: { name?: string; area?: string } }> }>({
    url: '/tenant/review/payment-proofs',
  })
}

export async function reviewTenantPaymentProof(id: string, payload: { status: 'approved' | 'rejected'; rejectionReason?: string }) {
  return api<TenantPaymentProof>({
    url: `/tenant/review/payment-proofs/${id}`,
    method: 'PATCH',
    data: payload,
  })
}

export async function getTenantReviewAbsences() {
  return api<{ items: Array<TenantAbsenceRequest & { tenantUserId?: { name?: string; email?: string }; pgId?: { name?: string; area?: string } }> }>({
    url: '/tenant/review/absences',
  })
}

export async function reviewTenantAbsence(id: string, payload: { status: 'approved' | 'rejected'; rejectionReason?: string }) {
  return api<TenantAbsenceRequest>({
    url: `/tenant/review/absences/${id}`,
    method: 'PATCH',
    data: payload,
  })
}

export async function getTenantReviewProfileUpdates() {
  return api<{ items: Array<TenantProfileUpdateRequest & { tenantUserId?: { name?: string; email?: string }; pgId?: { name?: string; area?: string } }> }>({
    url: '/tenant/review/profile-update-requests',
  })
}

export async function reviewTenantProfileUpdate(id: string, payload: { action: 'approve' | 'reject'; rejectionReason?: string }) {
  return api<TenantProfileUpdateRequest>({
    url: `/tenant/review/profile-update-requests/${id}`,
    method: 'PATCH',
    data: payload,
  })
}
