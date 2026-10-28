import { Router } from 'express'
import { z } from 'zod'

import { auth, type AuthedRequest } from '../middleware/auth'
import { BedModel } from '../models/Bed'
import { EnquiryModel } from '../models/Enquiry'
import { ListingModel } from '../models/Listing'
import { OwnerProfileModel } from '../models/OwnerProfile'
import { PgOwnerAssignmentModel } from '../models/PgOwnerAssignment'
import { ResidentActivityModel } from '../models/ResidentActivity'
import { ResidentModel } from '../models/Resident'
import { RoomModel } from '../models/Room'

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

const weeklyMenuSchema = z
  .array(
    z.object({
      day: z.string().trim().min(2).max(20),
      items: z.array(z.string().trim().min(1)).max(20),
    }),
  )
  .length(7, 'Weekly menu must contain all 7 days')

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

const updatePhotosSchema = z
  .array(z.string())
  .optional()
  .transform((photos) => (photos ? sanitizeImageUrls(photos) : undefined))
  .refine((photos) => !photos || photos.length <= 5, 'You can add at most 5 valid image URLs')

async function ensureApprovedOwner(ownerId: string) {
  const profile = await OwnerProfileModel.findOne({ userId: ownerId })
  return profile?.status === 'approved'
}

async function getAssignedPgIds(ownerId: string) {
  const assignments = await PgOwnerAssignmentModel.find({ ownerId }).select('pgId').lean()
  return assignments.map((item) => item.pgId)
}

async function ensureAssignedPg(ownerId: string, pgId: string) {
  const assigned = await PgOwnerAssignmentModel.findOne({ ownerId, pgId } as Record<string, unknown>)
  return Boolean(assigned)
}

async function initializePgBedInventory(pgId: string) {
  const listing = await ListingModel.findById(pgId)
  if (!listing) {
    throw new Error('Listing not found')
  }

  const targetBeds = Math.max(Number(listing.totalBeds ?? 0), 0)
  if (targetBeds <= 0) {
    return {
      createdRooms: 0,
      createdBeds: 0,
      totalBeds: 0,
      availableBeds: 0,
    }
  }

  const existingBedsCount = await BedModel.countDocuments({ pgId })
  if (existingBedsCount >= targetBeds) {
    await syncListingOccupancy(pgId)
    const availableBeds = await BedModel.countDocuments({ pgId, status: { $in: ['available', 'vacant', 'cleaning'] } })
    return {
      createdRooms: 0,
      createdBeds: 0,
      totalBeds: existingBedsCount,
      availableBeds,
    }
  }

  const configuredRooms = Math.max(Number(listing.totalRooms ?? 0), 0)
  const requiredRooms = Math.max(configuredRooms, 1)

  const existingRooms = await RoomModel.find({ pgId }).sort({ createdAt: 1 })
  let createdRooms = 0

  if (existingRooms.length < requiredRooms) {
    for (let index = existingRooms.length; index < requiredRooms; index += 1) {
      const room = await RoomModel.create({
        pgId,
        floorNumber: 1,
        roomNumber: `R${String(index + 1).padStart(3, '0')}`,
        totalBeds: 0,
        occupiedBeds: 0,
      })
      existingRooms.push(room)
      createdRooms += 1
    }
  }

  const existingBeds = await BedModel.find({ pgId }).select('roomId').lean()
  const bedCountByRoom = new Map<string, number>()
  for (const bed of existingBeds) {
    const key = String(bed.roomId)
    bedCountByRoom.set(key, (bedCountByRoom.get(key) ?? 0) + 1)
  }

  let bedsToCreate = targetBeds - existingBeds.length
  let createdBeds = 0
  let roomIndex = 0

  while (bedsToCreate > 0 && existingRooms.length > 0) {
    const room = existingRooms[roomIndex % existingRooms.length]
    if (!room) {
      break
    }
    const roomKey = String(room._id)
    const currentCount = bedCountByRoom.get(roomKey) ?? 0
    const nextCount = currentCount + 1

    await BedModel.create({
      pgId,
      roomId: room._id,
      bedLabel: `B${String(nextCount).padStart(2, '0')}`,
      status: 'available',
    })

    bedCountByRoom.set(roomKey, nextCount)
    createdBeds += 1
    bedsToCreate -= 1
    roomIndex += 1
  }

  for (const room of existingRooms) {
    const roomId = String(room._id)
    const totalBeds = bedCountByRoom.get(roomId) ?? 0
    const occupiedBeds = await BedModel.countDocuments({ roomId, status: 'occupied' })
    await RoomModel.findByIdAndUpdate(roomId, {
      totalBeds,
      occupiedBeds,
    })
  }

  await syncListingOccupancy(pgId)

  const totalBeds = await BedModel.countDocuments({ pgId })
  const availableBeds = await BedModel.countDocuments({ pgId, status: { $in: ['available', 'vacant', 'cleaning'] } })

  return {
    createdRooms,
    createdBeds,
    totalBeds,
    availableBeds,
  }
}

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

router.get('/dashboard/summary', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const assignedPgIds = await getAssignedPgIds(ownerId)
  const assignedFilter = { $in: assignedPgIds } as Record<string, unknown>

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - 6)

  const weeklyLabels: string[] = []
  const dayBoundaries: Date[] = []
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(weekStart)
    day.setDate(weekStart.getDate() + offset)
    day.setHours(0, 0, 0, 0)
    dayBoundaries.push(day)
    weeklyLabels.push(day.toLocaleDateString('en-US', { weekday: 'short' }))
  }

  const [activeListings, enquiries, listings, totalBeds, occupiedBeds, activeResidents, leftResidents, recentEnquiries] = await Promise.all([
    ListingModel.countDocuments({ _id: assignedFilter, status: 'live' } as Record<string, unknown>),
    EnquiryModel.countDocuments({ listingId: assignedFilter } as Record<string, unknown>),
    ListingModel.find({ _id: assignedFilter }).select('rating').lean(),
    BedModel.countDocuments({ pgId: assignedFilter }),
    BedModel.countDocuments({ pgId: assignedFilter, status: 'occupied' }),
    ResidentModel.countDocuments({ ownerId, pgId: assignedFilter, status: { $in: ['active', 'pending_verification', 'notice_period'] } } as Record<string, unknown>),
    ResidentModel.countDocuments({ ownerId, pgId: assignedFilter, status: 'left' } as Record<string, unknown>),
    EnquiryModel.find({ listingId: assignedFilter, createdAt: { $gte: weekStart } } as Record<string, unknown>).select('createdAt').lean(),
  ])

  const availableBeds = Math.max(totalBeds - occupiedBeds, 0)
  const occupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  const averageRating =
    listings.length > 0
      ? Number((listings.reduce((sum, listing) => sum + Number(listing.rating ?? 0), 0) / listings.length).toFixed(1))
      : 0

  const weeklyCounts = new Array(7).fill(0)
  for (const enquiry of recentEnquiries) {
    const createdAt = new Date(enquiry.createdAt)
    for (let index = 0; index < dayBoundaries.length; index += 1) {
      const start = dayBoundaries[index]
      if (!start) {
        continue
      }
      const next = dayBoundaries[index + 1] ?? new Date(today.getTime() + 24 * 60 * 60 * 1000)
      if (createdAt >= start && createdAt < next) {
        weeklyCounts[index] += 1
        break
      }
    }
  }

  res.json({
    activeListings,
    enquiries,
    totalBeds,
    occupiedBeds,
    availableBeds,
    activeResidents,
    leftResidents,
    occupancy,
    averageRating,
    weeklyEnquiries: weeklyLabels.map((label, index) => ({ label, count: weeklyCounts[index] })),
  })
})

router.get('/enquiries', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const assignedPgIds = await getAssignedPgIds(ownerId)

  const items = await EnquiryModel.find({ listingId: { $in: assignedPgIds } } as Record<string, unknown>)
    .populate('listingId', 'name')
    .sort({ createdAt: -1 })
  res.json({ items })
})

router.get('/pgs', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const assignedPgIds = await getAssignedPgIds(ownerId)
  const items = await ListingModel.find({ _id: { $in: assignedPgIds } }).sort({ createdAt: -1 })
  res.json({ items })
})

router.post('/pgs/:id/initialize-beds', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const pgId = String(req.params.id)

  const isAssigned = await ensureAssignedPg(ownerId, pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  try {
    const result = await initializePgBedInventory(pgId)
    if (result.totalBeds <= 0) {
      res.status(400).json({ message: 'Set PG total capacity before initializing beds' })
      return
    }

    res.json({
      message: 'Bed inventory initialized successfully',
      ...result,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Listing not found') {
      res.status(404).json({ message: 'Listing not found' })
      return
    }
    res.status(500).json({ message: 'Unable to initialize bed inventory' })
  }
})

router.patch('/pgs/:id', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const assignment = await PgOwnerAssignmentModel.findOne({
    pgId: req.params.id,
    ownerId,
  } as Record<string, unknown>)
  if (!assignment) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const parsed = z
    .object({
      name: z.string().min(2).optional(),
      address: z.string().min(2).optional(),
      area: areaSchema.optional(),
      pincode: z.string().trim().max(10).optional(),
      mapsLocation: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      description: z.string().optional(),
      baseRent: z.number().positive().optional(),
      deposit: z.number().nonnegative().optional(),
      maintenance: z.number().nonnegative().optional(),
      electricityRules: z.string().optional(),
      foodCharges: z.number().nonnegative().optional(),
      otherCharges: z.number().nonnegative().optional(),
      pgType: z.string().optional(),
      totalFloors: z.number().int().nonnegative().optional(),
      amenities: z.array(z.string()).optional(),
      photos: updatePhotosSchema,
      foodAvailable: z.boolean().optional(),
      weeklyMenu: weeklyMenuSchema.optional(),
      curfew: z.string().optional(),
      securityInfo: z.string().optional(),
      contactName: z.string().optional(),
      contactPhone: z
        .string()
        .trim()
        .regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits')
        .or(z.literal(''))
        .optional(),
      availability: z.number().int().nonnegative().optional(),
      totalRooms: z.number().int().nonnegative().optional(),
      totalBeds: z.number().int().nonnegative().optional(),
      gender: z.enum(['Men', 'Women', 'Co-ed']).optional(),
      roomTypes: z
        .array(
          z.object({
            sharing: z.enum(['Single', 'Double', 'Triple']),
            rent: z.number().positive(),
            deposit: z.number().positive(),
          }),
        )
        .optional(),
      status: z.enum(['pending', 'live', 'suspended', 'rejected', 'unassigned']).optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const { latitude, longitude } = parsed.data
  if ((latitude === undefined) !== (longitude === undefined)) {
    res.status(400).json({ message: 'Both latitude and longitude are required together' })
    return
  }

  if (latitude !== undefined && longitude !== undefined) {
    const coordsValidation = coordinatesSchema.safeParse({ latitude, longitude })
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

router.get('/residents', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const assignedPgIds = await getAssignedPgIds(ownerId)
  const parsed = z
    .object({
      pgId: z.string().optional(),
      status: z
        .enum(['invited', 'pending_verification', 'active', 'notice_period', 'left', 'suspended'])
        .optional(),
    })
    .safeParse(req.query)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const filter: Record<string, unknown> = {
    ownerId,
    pgId: { $in: assignedPgIds },
  }

  if (parsed.data.pgId) {
    filter.pgId = parsed.data.pgId
  }
  if (parsed.data.status) {
    filter.status = parsed.data.status
  }

  const items = await ResidentModel.find(filter).sort({ createdAt: -1 })
  res.json({ items })
})

router.post('/residents', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const parsed = z
    .object({
      pgId: z.string(),
      roomId: z.string().optional(),
      bedId: z.string().optional(),
      fullName: z.string().min(2),
      profilePhoto: z.string().url().optional(),
      phone: z.string().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits'),
      email: z.string().email().optional(),
      dateOfBirth: z.string().optional(),
      gender: z.enum(['Male', 'Female', 'Other']).default('Other'),
      emergencyContact: z.string().optional(),
      emergencyPhone: z.string().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits').optional(),
      idType: z.string().optional(),
      idVerified: z.boolean().optional(),
      address: z.string().optional(),
      occupation: z.string().optional(),
      organization: z.string().optional(),
      joiningDate: z.string(),
      expectedExitDate: z.string().optional(),
      rent: z.number().nonnegative().default(0),
      deposit: z.number().nonnegative().default(0),
      amountPaid: z.number().nonnegative().default(0),
      paymentStatus: z.enum(['pending', 'partial', 'paid']).default('pending'),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const isAssigned = await ensureAssignedPg(ownerId, parsed.data.pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  let roomId = parsed.data.roomId
  let bedId = parsed.data.bedId

  if (!roomId || !bedId) {
    const autoBed = await BedModel.findOne({ pgId: parsed.data.pgId, status: { $in: ['available', 'vacant', 'cleaning'] } })
      .sort({ createdAt: 1 })
      .lean()

    if (!autoBed) {
      res.status(409).json({ message: 'No available bed found in this PG' })
      return
    }

    roomId = String(autoBed.roomId)
    bedId = String(autoBed._id)
  }

  const [room, bed] = await Promise.all([
    RoomModel.findOne({ _id: roomId, pgId: parsed.data.pgId }),
    BedModel.findOne({ _id: bedId, roomId, pgId: parsed.data.pgId }),
  ])

  if (!room || !bed) {
    res.status(404).json({ message: 'Room or bed not found' })
    return
  }

  if (!['available', 'vacant', 'cleaning'].includes(bed.status)) {
    res.status(409).json({ message: 'Bed is not available for assignment' })
    return
  }

  const amountDue = Math.max(parsed.data.rent - parsed.data.amountPaid, 0)

  const resident = (await ResidentModel.create({
    ownerId,
    pgId: parsed.data.pgId,
    roomId,
    bedId,
    fullName: parsed.data.fullName,
    profilePhoto: parsed.data.profilePhoto ?? '',
    phone: parsed.data.phone,
    email: parsed.data.email ?? '',
    dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
    gender: parsed.data.gender,
    emergencyContact: parsed.data.emergencyContact ?? '',
    emergencyPhone: parsed.data.emergencyPhone ?? '',
    idType: parsed.data.idType ?? '',
    idVerified: parsed.data.idVerified ?? false,
    address: parsed.data.address ?? '',
    occupation: parsed.data.occupation ?? '',
    organization: parsed.data.organization ?? '',
    joiningDate: new Date(parsed.data.joiningDate),
    expectedExitDate: parsed.data.expectedExitDate ? new Date(parsed.data.expectedExitDate) : undefined,
    rent: parsed.data.rent,
    deposit: parsed.data.deposit,
    amountPaid: parsed.data.amountPaid,
    amountDue,
    paymentStatus: parsed.data.paymentStatus,
    status: 'active',
  } as Record<string, unknown>)) as {
    _id: unknown
    fullName: string
  }

  await BedModel.findByIdAndUpdate(bedId, { status: 'occupied' })
  await syncListingOccupancy(parsed.data.pgId)

  await ResidentActivityModel.create({
    residentId: String(resident._id),
    ownerId,
    activityType: 'resident_added',
    message: `${resident.fullName} added to Room ${room.roomNumber} Bed ${bed.bedLabel}`,
    metadata: {
      pgId: parsed.data.pgId,
      roomId,
      bedId,
    },
  })

  res.status(201).json(resident)
})

router.post('/residents/:id/move', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const parsed = z
    .object({
      pgId: z.string(),
      roomId: z.string(),
      bedId: z.string(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const resident = await ResidentModel.findOne({ _id: req.params.id, ownerId })
  if (!resident) {
    res.status(404).json({ message: 'Resident not found' })
    return
  }

  const isAssigned = await ensureAssignedPg(ownerId, parsed.data.pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const [newRoom, newBed] = await Promise.all([
    RoomModel.findOne({ _id: parsed.data.roomId, pgId: parsed.data.pgId }),
    BedModel.findOne({ _id: parsed.data.bedId, roomId: parsed.data.roomId, pgId: parsed.data.pgId }),
  ])

  if (!newRoom || !newBed) {
    res.status(404).json({ message: 'Destination room or bed not found' })
    return
  }

  if (!['available', 'vacant', 'cleaning'].includes(newBed.status)) {
    res.status(409).json({ message: 'Destination bed is not available' })
    return
  }

  const previous = {
    pgId: String(resident.pgId),
    roomId: String(resident.roomId),
    bedId: String(resident.bedId),
  }

  resident.pgId = parsed.data.pgId as unknown as never
  resident.roomId = parsed.data.roomId as unknown as never
  resident.bedId = parsed.data.bedId as unknown as never
  await resident.save()

  await Promise.all([
    BedModel.findByIdAndUpdate(previous.bedId, { status: 'available' }),
    BedModel.findByIdAndUpdate(parsed.data.bedId, { status: 'occupied' }),
  ])

  await Promise.all([syncListingOccupancy(previous.pgId), syncListingOccupancy(parsed.data.pgId)])

  await ResidentActivityModel.create({
    residentId: resident.id,
    ownerId,
    activityType: 'resident_moved',
    message: `${resident.fullName} moved to Room ${newRoom.roomNumber} Bed ${newBed.bedLabel}`,
    metadata: {
      from: previous,
      to: parsed.data,
    },
  })

  res.json(resident)
})

router.patch('/residents/:id', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const parsed = z
    .object({
      fullName: z.string().trim().min(2),
      phone: z.string().trim().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits'),
      joiningDate: z.string(),
      rent: z.number().nonnegative(),
      deposit: z.number().nonnegative(),
      amountPaid: z.number().nonnegative(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const resident = await ResidentModel.findOne({ _id: req.params.id, ownerId })
  if (!resident) {
    res.status(404).json({ message: 'Resident not found' })
    return
  }

  const amountDue = Math.max(parsed.data.rent - parsed.data.amountPaid, 0)
  const paymentStatus = parsed.data.amountPaid <= 0 ? 'pending' : amountDue === 0 ? 'paid' : 'partial'

  resident.fullName = parsed.data.fullName
  resident.phone = parsed.data.phone
  resident.joiningDate = new Date(parsed.data.joiningDate)
  resident.rent = parsed.data.rent
  resident.deposit = parsed.data.deposit
  resident.amountPaid = parsed.data.amountPaid
  resident.amountDue = amountDue
  resident.paymentStatus = paymentStatus as unknown as never
  await resident.save()

  await ResidentActivityModel.create({
    residentId: resident.id,
    ownerId,
    activityType: 'resident_updated',
    message: `${resident.fullName} details updated`,
    metadata: {
      rent: parsed.data.rent,
      deposit: parsed.data.deposit,
      amountPaid: parsed.data.amountPaid,
    },
  })

  res.json(resident)
})

router.post('/residents/:id/mark-left', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const parsed = z
    .object({
      leavingDate: z.string(),
      reason: z.string().default(''),
      finalPaymentStatus: z.string().default(''),
      depositSettlement: z.string().default(''),
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

  const resident = await ResidentModel.findOne({ _id: req.params.id, ownerId })
  if (!resident) {
    res.status(404).json({ message: 'Resident not found' })
    return
  }

  resident.status = 'left'
  resident.actualExitDate = new Date(parsed.data.leavingDate)
  resident.leavingReason = parsed.data.reason
  resident.finalPaymentStatus = parsed.data.finalPaymentStatus
  resident.depositSettlement = parsed.data.depositSettlement
  resident.finalSettlementAmount = parsed.data.finalSettlementAmount as unknown as never
  resident.finalSettlementPaid = parsed.data.finalSettlementPaid as unknown as never
  resident.finalSettlementPaidAt = parsed.data.finalSettlementPaid ? (new Date() as unknown as never) : null
  resident.exitNotes = parsed.data.notes
  resident.finalRoomCondition = parsed.data.finalRoomCondition
  await resident.save()

  await BedModel.findByIdAndUpdate(resident.bedId, { status: 'available' })
  await syncListingOccupancy(String(resident.pgId))

  await ResidentActivityModel.create({
    residentId: resident.id,
    ownerId,
    activityType: 'resident_left',
    message: `${resident.fullName} marked as left`,
    metadata: {
      leavingDate: parsed.data.leavingDate,
      reason: parsed.data.reason,
    },
  })

  res.json(resident)
})

router.get('/residents/:id/activity', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const resident = await ResidentModel.findOne({ _id: req.params.id, ownerId })
  if (!resident) {
    res.status(404).json({ message: 'Resident not found' })
    return
  }

  const items = await ResidentActivityModel.find({ residentId: resident.id }).sort({ createdAt: -1 })
  res.json({ items })
})

export default router
