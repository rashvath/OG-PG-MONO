import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { z } from 'zod'

import { auth, type AuthedRequest } from '../middleware/auth'
import { EnquiryModel } from '../models/Enquiry'
import { BedModel } from '../models/Bed'
import { ListingModel } from '../models/Listing'
import { OwnerApplicationModel } from '../models/OwnerApplication'
import { PgOwnerAssignmentModel } from '../models/PgOwnerAssignment'
import { OwnerProfileModel } from '../models/OwnerProfile'
import { ResidentModel } from '../models/Resident'
import { ResidentActivityModel } from '../models/ResidentActivity'
import { UserModel } from '../models/User'

const router = Router()

const PHONE_10_REGEX = /^\d{10}$/
const BENGALURU_BOUNDS = {
  minLat: 12.7343,
  maxLat: 13.1737,
  minLng: 77.4089,
  maxLng: 77.7821,
}

function isWithinBengaluru(latitude: number, longitude: number) {
  return (
    latitude >= BENGALURU_BOUNDS.minLat &&
    latitude <= BENGALURU_BOUNDS.maxLat &&
    longitude >= BENGALURU_BOUNDS.minLng &&
    longitude <= BENGALURU_BOUNDS.maxLng
  )
}

const coordinatesSchema = z
  .object({
    latitude: z.number(),
    longitude: z.number(),
  })
  .refine((value) => isWithinBengaluru(value.latitude, value.longitude), {
    message: 'Location must be within Bengaluru boundary',
  })

const areaSchema = z
  .string()
  .trim()
  .min(2, 'Area is required')
  .max(80, 'Area must be at most 80 characters')
  .transform((value) =>
    value
      .split(' ')
      .filter(Boolean)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
      .join(' '),
  )

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function sanitizeImageUrls(urls: string[]) {
  return Array.from(
    new Set(
      urls
        .map((url) => url.trim())
        .filter((url) => Boolean(url) && isValidHttpUrl(url)),
    ),
  )
}

const createPhotosSchema = z
  .array(z.string())
  .default([])
  .transform((photos) => sanitizeImageUrls(photos))
  .refine((photos) => photos.length <= 5, 'You can add at most 5 valid image URLs')

const updatePhotosSchema = z
  .array(z.string())
  .optional()
  .transform((photos) => (photos ? sanitizeImageUrls(photos) : undefined))
  .refine((photos) => !photos || photos.length <= 5, 'You can add at most 5 valid image URLs')

const roomTypeSchema = z.object({
  sharing: z.enum(['Single', 'Double', 'Triple']),
  rent: z.number().positive(),
  deposit: z.number().positive(),
})

const weeklyMenuSchema = z
  .array(
    z.object({
      day: z.string().trim().min(2).max(20),
      items: z.array(z.string().trim().min(1)).max(20),
    }),
  )
  .length(7, 'Weekly menu must contain all 7 days')

const DEFAULT_WEEKLY_MENU: Array<{ day: string; items: string[] }> = [
  { day: 'Monday', items: ['To be updated'] },
  { day: 'Tuesday', items: ['To be updated'] },
  { day: 'Wednesday', items: ['To be updated'] },
  { day: 'Thursday', items: ['To be updated'] },
  { day: 'Friday', items: ['To be updated'] },
  { day: 'Saturday', items: ['To be updated'] },
  { day: 'Sunday', items: ['To be updated'] },
]

async function syncListingOccupancy(pgId: string) {
  const [totalBeds, occupiedBeds] = await Promise.all([
    BedModel.countDocuments({ pgId }),
    BedModel.countDocuments({ pgId, status: 'occupied' }),
  ])

  await ListingModel.findByIdAndUpdate(pgId, {
    totalBeds,
    occupiedBeds,
    availableBeds: Math.max(totalBeds - occupiedBeds, 0),
  })
}

async function assignListingToOwner(pgId: string, ownerUserId: string, assignedBy: string) {
  await PgOwnerAssignmentModel.findOneAndUpdate(
    { pgId },
    {
      pgId,
      ownerId: ownerUserId,
      assignedBy,
      assignedAt: new Date(),
    },
    { upsert: true, setDefaultsOnInsert: true },
  )

  await ListingModel.findByIdAndUpdate(pgId, { ownerId: ownerUserId, status: 'live' })
}

router.get('/dashboard/summary', auth('admin'), async (_req, res) => {
  const [pgs, owners, users, pending] = await Promise.all([
    ListingModel.countDocuments(),
    OwnerProfileModel.countDocuments({ status: 'approved' }),
    UserModel.countDocuments(),
    OwnerApplicationModel.countDocuments({ status: 'pending' }),
  ])

  res.json({ pgs, owners, users, pending })
})

router.get('/pgs', auth('admin'), async (_req, res) => {
  const items = await ListingModel.find().sort({ createdAt: -1 }).lean()
  const ownerIds = items.map((item) => item.ownerId).filter(Boolean)
  const owners = await UserModel.find({ _id: { $in: ownerIds } }).select('name email').lean()
  const ownerMap = new Map(owners.map((owner) => [String(owner._id), owner]))

  res.json({
    items: items.map((item) => ({
      ...item,
      owner: item.ownerId ? ownerMap.get(String(item.ownerId)) ?? null : null,
    })),
  })
})

router.post('/pgs', auth('admin'), async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      address: z.string().min(2),
      area: areaSchema,
      mapsLocation: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      description: z.string().default(''),
      baseRent: z.number().positive(),
      gender: z.enum(['Men', 'Women', 'Co-ed']),
      amenities: z.array(z.string()).default([]),
      foodAvailable: z.boolean().default(false),
      weeklyMenu: weeklyMenuSchema.default(() => DEFAULT_WEEKLY_MENU.map((entry) => ({ ...entry }))),
      photos: createPhotosSchema,
      contactName: z.string().default(''),
      contactPhone: z.string().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits').default('0000000000'),
      availability: z.number().int().nonnegative().default(0),
      totalRooms: z.number().int().nonnegative().default(0),
      totalBeds: z.number().int().nonnegative().default(0),
      status: z.enum(['pending', 'live', 'suspended', 'rejected', 'unassigned']).default('unassigned'),
      roomTypes: z.array(roomTypeSchema).default([]),
      ownerId: z.string().optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  if ((parsed.data.latitude === undefined) !== (parsed.data.longitude === undefined)) {
    res.status(400).json({ message: 'Both latitude and longitude are required together' })
    return
  }

  if (parsed.data.latitude !== undefined && parsed.data.longitude !== undefined) {
    const coordsValidation = coordinatesSchema.safeParse({
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    })
    if (!coordsValidation.success) {
      res.status(400).json({ message: coordsValidation.error.flatten() })
      return
    }
  }

  const listing = await ListingModel.create({
    ...parsed.data,
    city: 'Bangalore',
    mapsLocation: parsed.data.mapsLocation ?? '',
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
    ownerId: (parsed.data.ownerId as unknown as never) ?? undefined,
    status: parsed.data.ownerId ? 'live' : parsed.data.status,
  })

  if (parsed.data.ownerId && req.user?.sub) {
    await assignListingToOwner(listing.id, parsed.data.ownerId, req.user.sub)
  }

  res.status(201).json(listing)
})

router.get('/owners', auth('admin'), async (_req, res) => {
  const owners = await UserModel.find({ role: 'owner' }).select('name email phone status createdAt').lean()
  const profiles = await OwnerProfileModel.find({ userId: { $in: owners.map((item) => item._id) } }).lean()
  const assignments = await PgOwnerAssignmentModel.find({ ownerId: { $in: owners.map((item) => item._id) } }).lean()

  const profileMap = new Map(profiles.map((item) => [String(item.userId), item]))
  const pgCountMap = new Map<string, number>()
  for (const assignment of assignments) {
    const key = String(assignment.ownerId)
    pgCountMap.set(key, (pgCountMap.get(key) ?? 0) + 1)
  }

  res.json({
    items: owners.map((owner) => ({
      ...owner,
      ownerStatus: profileMap.get(String(owner._id))?.status ?? 'pending',
      pgCount: pgCountMap.get(String(owner._id)) ?? 0,
      pgLimit: profileMap.get(String(owner._id))?.pgLimit ?? 0,
      pgRemaining: Math.max((profileMap.get(String(owner._id))?.pgLimit ?? 0) - (pgCountMap.get(String(owner._id)) ?? 0), 0),
      pgCreationEnabled: profileMap.get(String(owner._id))?.pgCreationEnabled ?? true,
    })),
  })
})

router.patch('/owners/:ownerId/limits', auth('admin'), async (req, res) => {
  const parsed = z
    .object({
      pgLimit: z.number().int().nonnegative().optional(),
      pgCreationEnabled: z.boolean().optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const owner = await UserModel.findById(req.params.ownerId)
  if (!owner || owner.role !== 'owner') {
    res.status(404).json({ message: 'Owner not found' })
    return
  }

  const profile = await OwnerProfileModel.findOneAndUpdate(
    { userId: owner.id },
    parsed.data,
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )

  res.json(profile)
})

router.get('/users', auth('admin'), async (_req, res) => {
  const items = await UserModel.find().select('-passwordHash').sort({ createdAt: -1 })
  res.json({ items })
})

router.get('/enquiries', auth('admin'), async (_req, res) => {
  const items = await EnquiryModel.find()
    .populate('listingId', 'name')
    .sort({ createdAt: -1 })
    .limit(50)

  res.json({ items })
})

router.get('/residents', auth('admin'), async (req, res) => {
  const parsed = z
    .object({
      status: z.enum(['invited', 'pending_verification', 'active', 'notice_period', 'left', 'suspended']).optional(),
      ownerId: z.string().optional(),
      pgId: z.string().optional(),
    })
    .safeParse(req.query)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const filter: Record<string, unknown> = {}
  if (parsed.data.status) {
    filter.status = parsed.data.status
  }
  if (parsed.data.ownerId) {
    filter.ownerId = parsed.data.ownerId
  }
  if (parsed.data.pgId) {
    filter.pgId = parsed.data.pgId
  }

  const items = await ResidentModel.find(filter)
    .populate('ownerId', 'name email')
    .populate('pgId', 'name area')
    .sort({ createdAt: -1 })

  res.json({ items })
})

router.post('/residents/:id/mark-left', auth('admin'), async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      leavingDate: z.string(),
      reason: z.string().default(''),
      finalSettlementAmount: z.number().nonnegative().default(0),
      finalSettlementPaid: z.boolean().default(false),
      notes: z.string().default(''),
      finalRoomCondition: z.string().default(''),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const resident = await ResidentModel.findById(req.params.id)
  if (!resident) {
    res.status(404).json({ message: 'Resident not found' })
    return
  }

  resident.status = 'left'
  resident.actualExitDate = new Date(parsed.data.leavingDate)
  resident.leavingReason = parsed.data.reason
  resident.finalSettlementAmount = parsed.data.finalSettlementAmount as unknown as never
  resident.finalSettlementPaid = parsed.data.finalSettlementPaid as unknown as never
  resident.finalSettlementPaidAt = parsed.data.finalSettlementPaid ? (new Date() as unknown as never) : null
  resident.exitNotes = parsed.data.notes
  resident.finalRoomCondition = parsed.data.finalRoomCondition

  await resident.save()

  await BedModel.findByIdAndUpdate(resident.bedId, { status: 'available' })
  await syncListingOccupancy(String(resident.pgId))

  if (req.user?.sub) {
    await ResidentActivityModel.create({
      residentId: resident.id,
      ownerId: req.user.sub,
      activityType: 'resident_left_admin',
      message: `${resident.fullName} marked as left by admin`,
      metadata: {
        leavingDate: parsed.data.leavingDate,
        reason: parsed.data.reason,
        finalSettlementAmount: parsed.data.finalSettlementAmount,
        finalSettlementPaid: parsed.data.finalSettlementPaid,
      },
    })
  }

  res.json(resident)
})

router.get('/search', auth('admin'), async (req, res) => {
  const parsed = z.object({ q: z.string().min(1) }).safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const q = parsed.data.q.trim()
  const regex = new RegExp(q, 'i')

  const [owners, pgs, residents] = await Promise.all([
    UserModel.find({ role: 'owner', $or: [{ name: regex }, { email: regex }, { phone: regex }] })
      .select('name email phone status')
      .limit(20),
    ListingModel.find({ $or: [{ name: regex }, { area: regex }, { address: regex }] })
      .select('name area address status ownerId')
      .limit(20),
    ResidentModel.find({
      $or: [{ fullName: regex }, { phone: regex }, { email: regex }, { occupation: regex }, { organization: regex }],
    })
      .select('fullName phone email status pgId roomId bedId')
      .limit(20),
  ])

  res.json({ owners, pgs, residents })
})

router.post('/owners', auth('admin'), async (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits'),
      temporaryPassword: z.string().min(6),
      status: z.enum(['pending', 'approved', 'rejected', 'suspended']).default('approved'),
      assignedPgIds: z.array(z.string()).default([]),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const existing = await UserModel.findOne({ email: parsed.data.email.toLowerCase() })
  if (existing) {
    res.status(409).json({ message: 'Email already exists' })
    return
  }

  const passwordHash = await bcrypt.hash(parsed.data.temporaryPassword, 10)
  const ownerUser = await UserModel.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    phone: parsed.data.phone,
    role: 'owner',
    status: 'active',
    passwordHash,
  })

  await OwnerProfileModel.create({
    userId: ownerUser.id,
    phone: parsed.data.phone,
    status: parsed.data.status,
    mustChangePassword: true,
  })

  if (parsed.data.status === 'approved' && req.user?.sub) {
    for (const pgId of parsed.data.assignedPgIds) {
      await assignListingToOwner(pgId, ownerUser.id, req.user.sub)
    }
  }

  res.status(201).json({
    ownerId: ownerUser.id,
    credentials: {
      email: ownerUser.email,
      temporaryPassword: parsed.data.temporaryPassword,
      mustChangePassword: true,
    },
  })
})

router.post('/owners/:ownerId/assign-pgs', auth('admin'), async (req: AuthedRequest, res) => {
  const parsed = z.object({ pgIds: z.array(z.string()).min(1) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const owner = await UserModel.findById(req.params.ownerId)
  if (!owner || owner.role !== 'owner') {
    res.status(404).json({ message: 'Owner not found' })
    return
  }

  if (!req.user?.sub) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const ownerProfile = await OwnerProfileModel.findOne({ userId: owner.id })
  const pgLimit = ownerProfile?.pgLimit ?? 0
  const currentCount = await PgOwnerAssignmentModel.countDocuments({ ownerId: owner.id })
  const projected = currentCount + parsed.data.pgIds.length
  if (projected > pgLimit) {
    res.status(400).json({
      message: `Owner PG limit exceeded. Current: ${currentCount}, Limit: ${pgLimit}, Requested: ${parsed.data.pgIds.length}`,
    })
    return
  }

  for (const pgId of parsed.data.pgIds) {
    await assignListingToOwner(pgId, owner.id, req.user.sub)
  }

  await OwnerProfileModel.findOneAndUpdate({ userId: owner.id }, { status: 'approved' })

  res.json({ message: 'PGs assigned successfully' })
})

router.patch('/owners/:ownerId/status', auth('admin'), async (req, res) => {
  const parsed = z.object({ status: z.enum(['active', 'blocked']) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const owner = await UserModel.findById(req.params.ownerId)
  if (!owner || owner.role !== 'owner') {
    res.status(404).json({ message: 'Owner not found' })
    return
  }

  owner.status = parsed.data.status
  await owner.save()

  await OwnerProfileModel.findOneAndUpdate(
    { userId: owner.id },
    { status: parsed.data.status === 'blocked' ? 'suspended' : 'approved' },
  )

  res.json({ message: `Owner ${parsed.data.status === 'blocked' ? 'blocked' : 'activated'} successfully` })
})

router.delete('/owners/:ownerId', auth('admin'), async (req, res) => {
  const owner = await UserModel.findById(req.params.ownerId)
  if (!owner || owner.role !== 'owner') {
    res.status(404).json({ message: 'Owner not found' })
    return
  }

  const assignments = await PgOwnerAssignmentModel.find({ ownerId: owner.id }).select('pgId').lean()
  const pgIds = assignments.map((item) => item.pgId)

  if (pgIds.length > 0) {
    await ListingModel.updateMany(
      { _id: { $in: pgIds } },
      { $set: { status: 'unassigned' }, $unset: { ownerId: 1 } },
    )
    await PgOwnerAssignmentModel.deleteMany({ ownerId: owner.id })
  }

  await Promise.all([
    OwnerProfileModel.deleteOne({ userId: owner.id }),
    OwnerApplicationModel.deleteMany({ ownerUserId: owner.id }),
    UserModel.deleteOne({ _id: owner.id }),
  ])

  res.json({ message: 'Owner deleted successfully' })
})

router.get('/owner-applications', auth('admin'), async (req, res) => {
  const parsed = z
    .object({
      status: z.enum(['pending', 'approved', 'rejected', 'suspended']).default('pending'),
    })
    .safeParse(req.query)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const items = await OwnerApplicationModel.find({ status: parsed.data.status }).sort({ createdAt: -1 })
  res.json({ items })
})

router.post('/owner-applications/:id/approve', auth('admin'), async (req: AuthedRequest, res) => {
  const application = await OwnerApplicationModel.findById(req.params.id)
  if (!application) {
    res.status(404).json({ message: 'Application not found' })
    return
  }

  if (!req.user?.sub) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  application.status = 'approved'
  application.reviewedAt = new Date()
  application.set('reviewedBy', req.user.sub as unknown as never)
  await application.save()

  await OwnerProfileModel.findOneAndUpdate(
    { userId: application.ownerUserId },
    { status: 'approved' },
    { upsert: true, setDefaultsOnInsert: true },
  )

  const listing = await ListingModel.create({
    name: application.pgName,
    address: application.pgAddress,
    area: application.area,
    description: application.description,
    baseRent: application.rent,
    gender: 'Co-ed',
    amenities: application.amenities,
    photos: application.photos,
    contactName: application.name,
    contactPhone: application.mobile,
    availability: application.numberOfRooms,
    status: 'live',
    ownerId: application.ownerUserId,
    roomTypes: [],
  })

  await assignListingToOwner(listing.id, String(application.ownerUserId), req.user.sub)

  res.json({ message: 'Owner approved and PG assigned', listingId: listing.id })
})

router.post('/owner-applications/:id/reject', auth('admin'), async (req: AuthedRequest, res) => {
  const application = await OwnerApplicationModel.findById(req.params.id)
  if (!application) {
    res.status(404).json({ message: 'Application not found' })
    return
  }

  application.status = 'rejected'
  application.reviewedAt = new Date()
  if (req.user?.sub) {
    application.set('reviewedBy', req.user.sub as unknown as never)
  }
  await application.save()

  await OwnerProfileModel.findOneAndUpdate({ userId: application.ownerUserId }, { status: 'rejected' })

  res.json({ message: 'Owner application rejected' })
})

router.patch('/listings/:id/status', auth('admin'), async (req, res) => {
  const parsed = z
    .object({ status: z.enum(['pending', 'live', 'suspended', 'rejected', 'unassigned']) })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const listing = await ListingModel.findByIdAndUpdate(
    req.params.id,
    { status: parsed.data.status },
    { new: true },
  )

  if (!listing) {
    res.status(404).json({ message: 'Listing not found' })
    return
  }

  res.json(listing)
})

router.patch('/pgs/:id', auth('admin'), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2).optional(),
      address: z.string().min(2).optional(),
      area: areaSchema.optional(),
      mapsLocation: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      description: z.string().optional(),
      baseRent: z.number().positive().optional(),
      amenities: z.array(z.string()).optional(),
      foodAvailable: z.boolean().optional(),
      weeklyMenu: weeklyMenuSchema.optional(),
      photos: updatePhotosSchema,
      contactName: z.string().optional(),
      contactPhone: z.string().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits').optional(),
      availability: z.number().int().nonnegative().optional(),
      totalRooms: z.number().int().nonnegative().optional(),
      totalBeds: z.number().int().nonnegative().optional(),
      gender: z.enum(['Men', 'Women', 'Co-ed']).optional(),
      roomTypes: z.array(roomTypeSchema).optional(),
      status: z.enum(['pending', 'live', 'suspended', 'rejected', 'unassigned']).optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  if ((parsed.data.latitude === undefined) !== (parsed.data.longitude === undefined)) {
    res.status(400).json({ message: 'Both latitude and longitude are required together' })
    return
  }

  if (parsed.data.latitude !== undefined && parsed.data.longitude !== undefined) {
    const coordsValidation = coordinatesSchema.safeParse({
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    })
    if (!coordsValidation.success) {
      res.status(400).json({ message: coordsValidation.error.flatten() })
      return
    }
  }

  const updateData =
    Array.isArray(parsed.data.photos) && parsed.data.photos.length === 0
      ? (({ photos, ...rest }) => rest)(parsed.data)
      : parsed.data

  const listing = await ListingModel.findByIdAndUpdate(req.params.id, updateData, { new: true })
  if (!listing) {
    res.status(404).json({ message: 'Listing not found' })
    return
  }

  res.json(listing)
})

router.patch('/users/:id/status', auth('admin'), async (req, res) => {
  const parsed = z.object({ status: z.enum(['active', 'blocked']) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const user = await UserModel.findByIdAndUpdate(req.params.id, parsed.data, { new: true }).select(
    '-passwordHash',
  )
  if (!user) {
    res.status(404).json({ message: 'User not found' })
    return
  }

  res.json(user)
})

export default router
