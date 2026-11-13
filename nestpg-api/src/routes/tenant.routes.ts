import { Router } from 'express'
import { z } from 'zod'

import { auth, type AuthedRequest } from '../middleware/auth'
import { ListingModel } from '../models/Listing'
import { TenantAbsenceModel } from '../models/TenantAbsence'
import { TenantComplaintModel } from '../models/TenantComplaint'
import { TenantPaymentProofModel } from '../models/TenantPaymentProof'
import { TenantProfileUpdateRequestModel } from '../models/TenantProfileUpdateRequest'
import { UserModel } from '../models/User'

const router = Router()

const PHONE_10_REGEX = /^\d{10}$/
const TENANT_PROFILE_FIELDS = [
  'name',
  'phone',
  'email',
  'profileAddress',
  'emergencyContactName',
  'emergencyContactPhone',
] as const

type TenantProfileField = (typeof TENANT_PROFILE_FIELDS)[number]
type TenantProfileSnapshot = Record<TenantProfileField, string>

function isOwnerOrAdmin(role?: string) {
  return role === 'owner' || role === 'admin'
}

async function getTenantScope(tenantUserId: string) {
  const tenant = await UserModel.findById(tenantUserId)
  if (!tenant || tenant.role !== 'tenant') {
    return null
  }

  const tenantApprovalStatus = String(tenant.get('tenantApprovalStatus') ?? 'none')
  const pgId = String(tenant.get('tenantPgId') ?? '')
  const ownerId = String(tenant.get('tenantOwnerId') ?? '')

  if (tenantApprovalStatus !== 'approved' || !pgId || !ownerId) {
    return null
  }

  return { tenant, pgId, ownerId }
}

function getTenantProfileSnapshot(tenant: {
  name?: string
  phone?: string
  email?: string
  profileAddress?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
}): TenantProfileSnapshot {
  return {
    name: String(tenant.name ?? '').trim(),
    phone: String(tenant.phone ?? '').trim(),
    email: String(tenant.email ?? '').trim().toLowerCase(),
    profileAddress: String(tenant.profileAddress ?? '').trim(),
    emergencyContactName: String(tenant.emergencyContactName ?? '').trim(),
    emergencyContactPhone: String(tenant.emergencyContactPhone ?? '').trim(),
  }
}

function getLegacyProposedValues(item: Record<string, unknown>) {
  return {
    name: String(item.requestedName ?? '').trim(),
    phone: String(item.requestedPhone ?? '').trim(),
    email: String(item.requestedEmail ?? '').trim().toLowerCase(),
    profileAddress: String(item.requestedAddress ?? '').trim(),
    emergencyContactName: String(item.requestedEmergencyContact ?? '').trim(),
    emergencyContactPhone: String(item.requestedEmergencyPhone ?? '').trim(),
  }
}

function getRequestSnapshotValues(item: Record<string, unknown>) {
  const proposedRaw = item.proposedValues
  const currentRaw = item.currentValues
  const requestedFieldsRaw = item.requestedFields

  const legacyProposed = getLegacyProposedValues(item)

  const currentValues: TenantProfileSnapshot = {
    name: String((currentRaw as TenantProfileSnapshot | undefined)?.name ?? '').trim(),
    phone: String((currentRaw as TenantProfileSnapshot | undefined)?.phone ?? '').trim(),
    email: String((currentRaw as TenantProfileSnapshot | undefined)?.email ?? '').trim().toLowerCase(),
    profileAddress: String((currentRaw as TenantProfileSnapshot | undefined)?.profileAddress ?? '').trim(),
    emergencyContactName: String((currentRaw as TenantProfileSnapshot | undefined)?.emergencyContactName ?? '').trim(),
    emergencyContactPhone: String((currentRaw as TenantProfileSnapshot | undefined)?.emergencyContactPhone ?? '').trim(),
  }

  const proposedValues: TenantProfileSnapshot = {
    name: String((proposedRaw as TenantProfileSnapshot | undefined)?.name ?? legacyProposed.name ?? '').trim(),
    phone: String((proposedRaw as TenantProfileSnapshot | undefined)?.phone ?? legacyProposed.phone ?? '').trim(),
    email: String((proposedRaw as TenantProfileSnapshot | undefined)?.email ?? legacyProposed.email ?? '').trim().toLowerCase(),
    profileAddress: String((proposedRaw as TenantProfileSnapshot | undefined)?.profileAddress ?? legacyProposed.profileAddress ?? '').trim(),
    emergencyContactName: String(
      (proposedRaw as TenantProfileSnapshot | undefined)?.emergencyContactName ?? legacyProposed.emergencyContactName ?? '',
    ).trim(),
    emergencyContactPhone: String(
      (proposedRaw as TenantProfileSnapshot | undefined)?.emergencyContactPhone ?? legacyProposed.emergencyContactPhone ?? '',
    ).trim(),
  }

  const requestedFieldsFromDoc = Array.isArray(requestedFieldsRaw)
    ? requestedFieldsRaw.filter((field): field is TenantProfileField => TENANT_PROFILE_FIELDS.includes(field as TenantProfileField))
    : []

  const requestedFields = requestedFieldsFromDoc.length
    ? requestedFieldsFromDoc
    : TENANT_PROFILE_FIELDS.filter((field) => Boolean(proposedValues[field]))

  return { currentValues, proposedValues, requestedFields }
}

router.get('/tenant/me', auth('tenant'), async (req: AuthedRequest, res) => {
  const tenantUserId = req.user?.sub
  if (!tenantUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const tenant = await UserModel.findById(tenantUserId).select('-passwordHash').lean()
  if (!tenant) {
    res.status(404).json({ message: 'Tenant not found' })
    return
  }

  const pgId = tenant.tenantPgId ? String(tenant.tenantPgId) : ''
  const pg = pgId ? await ListingModel.findById(pgId).select('name area address').lean() : null

  res.json({
    tenant,
    pg,
  })
})

router.post('/tenant/profile-update-requests', auth('tenant'), async (req: AuthedRequest, res) => {
  const tenantUserId = req.user?.sub
  if (!tenantUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const scope = await getTenantScope(tenantUserId)
  if (!scope) {
    res.status(403).json({ message: 'Tenant account must be approved before submitting requests' })
    return
  }

  const parsed = z
    .object({
      changes: z
        .object({
          name: z.string().trim().min(2).max(120).optional(),
          phone: z.string().trim().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits').optional(),
          email: z.string().trim().email().optional(),
          profileAddress: z.string().trim().max(500).optional(),
          emergencyContactName: z.string().trim().max(120).optional(),
          emergencyContactPhone: z.string().trim().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits').optional(),
        })
        .optional(),
      notes: z.string().trim().max(500).optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const tenantSnapshot = getTenantProfileSnapshot(scope.tenant)
  const changes = parsed.data.changes ?? {}

  const requestedFields: TenantProfileField[] = []
  const proposedValues: TenantProfileSnapshot = {
    name: '',
    phone: '',
    email: '',
    profileAddress: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  }
  const currentValues: TenantProfileSnapshot = {
    ...proposedValues,
  }

  for (const field of TENANT_PROFILE_FIELDS) {
    const nextRaw = changes[field]
    if (typeof nextRaw !== 'string') {
      continue
    }

    const nextValue = field === 'email' ? nextRaw.trim().toLowerCase() : nextRaw.trim()
    const currentValue = tenantSnapshot[field]

    if (!nextValue || nextValue === currentValue) {
      continue
    }

    requestedFields.push(field)
    currentValues[field] = currentValue
    proposedValues[field] = nextValue
  }

  if (!requestedFields.length) {
    res.status(400).json({ message: 'Select at least one changed profile field before submitting' })
    return
  }

  if (requestedFields.includes('email')) {
    const existing = await UserModel.findOne({ email: proposedValues.email, _id: { $ne: tenantUserId } }).lean()
    if (existing) {
      res.status(409).json({ message: 'The proposed email is already in use' })
      return
    }
  }

  const pending = await TenantProfileUpdateRequestModel.findOne({
    tenantUserId,
    status: 'pending',
  }).lean()

  if (pending) {
    res.status(409).json({ message: 'A profile update request is already pending review' })
    return
  }

  const item = await TenantProfileUpdateRequestModel.create({
    tenantUserId,
    ownerId: scope.ownerId,
    pgId: scope.pgId,
    requestedName: proposedValues.name,
    requestedPhone: proposedValues.phone,
    requestedEmail: proposedValues.email,
    requestedEmergencyContact: proposedValues.emergencyContactName,
    requestedEmergencyPhone: proposedValues.emergencyContactPhone,
    requestedAddress: proposedValues.profileAddress,
    requestedFields,
    currentValues,
    proposedValues,
    notes: parsed.data.notes ?? '',
    status: 'pending',
  })

  res.status(201).json(item)
})

router.get('/tenant/profile-update-requests', auth('tenant'), async (req: AuthedRequest, res) => {
  const tenantUserId = req.user?.sub
  if (!tenantUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const items = await TenantProfileUpdateRequestModel.find({ tenantUserId }).sort({ createdAt: -1 })
  res.json({ items })
})

router.post('/tenant/complaints', auth('tenant'), async (req: AuthedRequest, res) => {
  const tenantUserId = req.user?.sub
  if (!tenantUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const scope = await getTenantScope(tenantUserId)
  if (!scope) {
    res.status(403).json({ message: 'Tenant account must be approved before raising complaints' })
    return
  }

  const parsed = z
    .object({
      title: z.string().trim().min(3).max(120),
      description: z.string().trim().min(5).max(1000),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const item = await TenantComplaintModel.create({
    tenantUserId,
    ownerId: scope.ownerId,
    pgId: scope.pgId,
    title: parsed.data.title,
    description: parsed.data.description,
    status: 'open',
  })

  res.status(201).json(item)
})

router.get('/tenant/complaints', auth('tenant'), async (req: AuthedRequest, res) => {
  const tenantUserId = req.user?.sub
  if (!tenantUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const items = await TenantComplaintModel.find({ tenantUserId }).sort({ createdAt: -1 })
  res.json({ items })
})

router.post('/tenant/payment-proofs', auth('tenant'), async (req: AuthedRequest, res) => {
  const tenantUserId = req.user?.sub
  if (!tenantUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const scope = await getTenantScope(tenantUserId)
  if (!scope) {
    res.status(403).json({ message: 'Tenant account must be approved before submitting payment proofs' })
    return
  }

  const parsed = z
    .object({
      amount: z.number().positive(),
      paidForMonth: z.string().trim().max(40).optional(),
      transactionRef: z.string().trim().max(80).optional(),
      screenshotUrl: z.string().trim().url(),
      notes: z.string().trim().max(500).optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const item = await TenantPaymentProofModel.create({
    tenantUserId,
    ownerId: scope.ownerId,
    pgId: scope.pgId,
    amount: parsed.data.amount,
    paidForMonth: parsed.data.paidForMonth ?? '',
    transactionRef: parsed.data.transactionRef ?? '',
    screenshotUrl: parsed.data.screenshotUrl,
    notes: parsed.data.notes ?? '',
    status: 'pending',
  })

  res.status(201).json(item)
})

router.get('/tenant/payment-proofs', auth('tenant'), async (req: AuthedRequest, res) => {
  const tenantUserId = req.user?.sub
  if (!tenantUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const items = await TenantPaymentProofModel.find({ tenantUserId }).sort({ createdAt: -1 })
  res.json({ items })
})

router.post('/tenant/absences', auth('tenant'), async (req: AuthedRequest, res) => {
  const tenantUserId = req.user?.sub
  if (!tenantUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const scope = await getTenantScope(tenantUserId)
  if (!scope) {
    res.status(403).json({ message: 'Tenant account must be approved before creating absence requests' })
    return
  }

  const parsed = z
    .object({
      fromDate: z.string(),
      toDate: z.string(),
      reason: z.string().trim().min(3).max(500),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const fromDate = new Date(parsed.data.fromDate)
  const toDate = new Date(parsed.data.toDate)
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || toDate < fromDate) {
    res.status(400).json({ message: 'Invalid absence date range' })
    return
  }

  const item = await TenantAbsenceModel.create({
    tenantUserId,
    ownerId: scope.ownerId,
    pgId: scope.pgId,
    fromDate,
    toDate,
    reason: parsed.data.reason,
    status: 'pending',
  })

  res.status(201).json(item)
})

router.get('/tenant/absences', auth('tenant'), async (req: AuthedRequest, res) => {
  const tenantUserId = req.user?.sub
  if (!tenantUserId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const items = await TenantAbsenceModel.find({ tenantUserId }).sort({ createdAt: -1 })
  res.json({ items })
})

router.get('/tenant/approvals', auth(), async (req: AuthedRequest, res) => {
  const actorUserId = req.user?.sub
  const actorRole = req.user?.role
  if (!actorUserId || !isOwnerOrAdmin(actorRole)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const filter: Record<string, unknown> = {
    role: 'tenant',
    tenantApprovalStatus: 'pending',
  }

  if (actorRole === 'owner') {
    filter.tenantOwnerId = actorUserId
  }

  const items = await UserModel.find(filter)
    .select('name email phone tenantPgId tenantOwnerId createdAt')
    .populate('tenantPgId', 'name area')
    .sort({ createdAt: -1 })

  res.json({ items })
})

router.patch('/tenant/approvals/:tenantUserId', auth(), async (req: AuthedRequest, res) => {
  const actorUserId = req.user?.sub
  const actorRole = req.user?.role
  if (!actorUserId || !isOwnerOrAdmin(actorRole)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const parsed = z
    .object({
      action: z.enum(['approve', 'reject']),
      reason: z.string().trim().max(500).optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const tenant = await UserModel.findById(req.params.tenantUserId)
  if (!tenant || tenant.role !== 'tenant') {
    res.status(404).json({ message: 'Tenant account not found' })
    return
  }

  if (actorRole === 'owner' && String(tenant.get('tenantOwnerId') ?? '') !== actorUserId) {
    res.status(403).json({ message: 'Forbidden: tenant does not belong to this owner' })
    return
  }

  tenant.set('tenantApprovalStatus', parsed.data.action === 'approve' ? 'approved' : 'rejected')
  tenant.set('tenantApprovalReviewedBy', actorUserId)
  tenant.set('tenantApprovalReviewedAt', new Date())
  tenant.set('tenantApprovalReason', parsed.data.reason ?? '')
  await tenant.save()

  res.json({
    message: `Tenant ${parsed.data.action === 'approve' ? 'approved' : 'rejected'} successfully`,
  })
})

router.get('/tenant/review/complaints', auth(), async (req: AuthedRequest, res) => {
  const actorUserId = req.user?.sub
  const actorRole = req.user?.role
  if (!actorUserId || !isOwnerOrAdmin(actorRole)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const filter: Record<string, unknown> = actorRole === 'owner' ? { ownerId: actorUserId } : {}
  const items = await TenantComplaintModel.find(filter)
    .populate('tenantUserId', 'name email phone')
    .populate('pgId', 'name area')
    .sort({ createdAt: -1 })

  res.json({ items })
})

router.patch('/tenant/review/complaints/:id', auth(), async (req: AuthedRequest, res) => {
  const actorUserId = req.user?.sub
  const actorRole = req.user?.role
  if (!actorUserId || !isOwnerOrAdmin(actorRole)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const parsed = z
    .object({
      status: z.enum(['in_progress', 'resolved', 'rejected']),
      resolutionNote: z.string().trim().max(500).optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const item = await TenantComplaintModel.findById(req.params.id)
  if (!item) {
    res.status(404).json({ message: 'Complaint not found' })
    return
  }

  if (actorRole === 'owner' && String(item.ownerId) !== actorUserId) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  item.status = parsed.data.status
  item.resolutionNote = parsed.data.resolutionNote ?? ''
  item.reviewedBy = actorUserId as unknown as never
  item.resolvedAt = parsed.data.status === 'resolved' ? (new Date() as unknown as never) : null
  await item.save()

  res.json(item)
})

router.get('/tenant/review/payment-proofs', auth(), async (req: AuthedRequest, res) => {
  const actorUserId = req.user?.sub
  const actorRole = req.user?.role
  if (!actorUserId || !isOwnerOrAdmin(actorRole)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const filter: Record<string, unknown> = actorRole === 'owner' ? { ownerId: actorUserId } : {}
  const items = await TenantPaymentProofModel.find(filter)
    .populate('tenantUserId', 'name email phone')
    .populate('pgId', 'name area')
    .sort({ createdAt: -1 })

  res.json({ items })
})

router.patch('/tenant/review/payment-proofs/:id', auth(), async (req: AuthedRequest, res) => {
  const actorUserId = req.user?.sub
  const actorRole = req.user?.role
  if (!actorUserId || !isOwnerOrAdmin(actorRole)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const parsed = z
    .object({
      status: z.enum(['approved', 'rejected']),
      rejectionReason: z.string().trim().max(500).optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const item = await TenantPaymentProofModel.findById(req.params.id)
  if (!item) {
    res.status(404).json({ message: 'Payment proof not found' })
    return
  }

  if (actorRole === 'owner' && String(item.ownerId) !== actorUserId) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  item.status = parsed.data.status
  item.rejectionReason = parsed.data.status === 'rejected' ? parsed.data.rejectionReason ?? '' : ''
  item.reviewedBy = actorUserId as unknown as never
  item.reviewedAt = new Date() as unknown as never
  await item.save()

  res.json(item)
})

router.get('/tenant/review/absences', auth(), async (req: AuthedRequest, res) => {
  const actorUserId = req.user?.sub
  const actorRole = req.user?.role
  if (!actorUserId || !isOwnerOrAdmin(actorRole)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const filter: Record<string, unknown> = actorRole === 'owner' ? { ownerId: actorUserId } : {}
  const items = await TenantAbsenceModel.find(filter)
    .populate('tenantUserId', 'name email phone')
    .populate('pgId', 'name area')
    .sort({ createdAt: -1 })

  res.json({ items })
})

router.patch('/tenant/review/absences/:id', auth(), async (req: AuthedRequest, res) => {
  const actorUserId = req.user?.sub
  const actorRole = req.user?.role
  if (!actorUserId || !isOwnerOrAdmin(actorRole)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const parsed = z
    .object({
      status: z.enum(['approved', 'rejected']),
      rejectionReason: z.string().trim().max(500).optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const item = await TenantAbsenceModel.findById(req.params.id)
  if (!item) {
    res.status(404).json({ message: 'Absence request not found' })
    return
  }

  if (actorRole === 'owner' && String(item.ownerId) !== actorUserId) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  item.status = parsed.data.status
  item.rejectionReason = parsed.data.status === 'rejected' ? parsed.data.rejectionReason ?? '' : ''
  item.reviewedBy = actorUserId as unknown as never
  item.reviewedAt = new Date() as unknown as never
  await item.save()

  res.json(item)
})

router.get('/tenant/review/profile-update-requests', auth(), async (req: AuthedRequest, res) => {
  const actorUserId = req.user?.sub
  const actorRole = req.user?.role
  if (!actorUserId || !isOwnerOrAdmin(actorRole)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const filter: Record<string, unknown> = actorRole === 'owner' ? { ownerId: actorUserId } : {}
  const items = await TenantProfileUpdateRequestModel.find(filter)
    .populate('tenantUserId', 'name email phone')
    .populate('pgId', 'name area')
    .sort({ createdAt: -1 })

  res.json({ items })
})

router.patch('/tenant/review/profile-update-requests/:id', auth(), async (req: AuthedRequest, res) => {
  const actorUserId = req.user?.sub
  const actorRole = req.user?.role
  if (!actorUserId || !isOwnerOrAdmin(actorRole)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const parsed = z
    .object({
      action: z.enum(['approve', 'reject']),
      rejectionReason: z.string().trim().max(500).optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const item = await TenantProfileUpdateRequestModel.findById(req.params.id)
  if (!item) {
    res.status(404).json({ message: 'Profile update request not found' })
    return
  }

  if (actorRole === 'owner' && String(item.ownerId) !== actorUserId) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  if (item.status !== 'pending') {
    res.status(409).json({ message: 'This profile update request has already been reviewed' })
    return
  }

  const { proposedValues, requestedFields } = getRequestSnapshotValues(item.toObject())

  if (parsed.data.action === 'approve' && requestedFields.includes('email')) {
    const existing = await UserModel.findOne({ email: proposedValues.email, _id: { $ne: item.tenantUserId } }).lean()
    if (existing) {
      res.status(409).json({ message: 'Cannot approve: proposed email is already in use' })
      return
    }
  }

  item.status = parsed.data.action === 'approve' ? 'approved' : 'rejected'
  item.rejectionReason = parsed.data.action === 'reject' ? parsed.data.rejectionReason ?? '' : ''
  item.reviewedBy = actorUserId as unknown as never
  item.reviewedAt = new Date() as unknown as never
  await item.save()

  if (parsed.data.action === 'approve') {
    const tenant = await UserModel.findById(item.tenantUserId)
    if (tenant) {
      for (const field of requestedFields) {
        const nextValue = proposedValues[field]
        if (!nextValue) {
          continue
        }

        if (field === 'name') {
          tenant.name = nextValue
        }

        if (field === 'phone') {
          tenant.phone = nextValue
        }

        if (field === 'email') {
          tenant.email = nextValue
        }

        if (field === 'profileAddress') {
          tenant.set('profileAddress', nextValue)
        }

        if (field === 'emergencyContactName') {
          tenant.set('emergencyContactName', nextValue)
        }

        if (field === 'emergencyContactPhone') {
          tenant.set('emergencyContactPhone', nextValue)
        }
      }

      await tenant.save()
    }
  }

  res.json(item)
})

export default router
