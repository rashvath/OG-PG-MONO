import { Router } from 'express'
import { z } from 'zod'

import { auth, type AuthedRequest } from '../middleware/auth'
import { BalanceSheetModel } from '../models/BalanceSheet'
import { BedModel } from '../models/Bed'
import { EnquiryModel } from '../models/Enquiry'
import { LedgerEntryModel } from '../models/LedgerEntry'
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

const ledgerEntryInputSchema = z.object({
  pgId: z.string().optional(),
  entryType: z.enum(['income', 'expense']),
  category: z.string().trim().min(1).max(80),
  amount: z.number().positive(),
  entryDate: z.coerce.date(),
  notes: z.string().trim().max(500).optional(),
  residentName: z.string().trim().max(120).optional(),
})

const balanceSheetBaseSchema = z.object({
  title: z.string().trim().min(2).max(150).optional(),
  pgId: z.string().optional(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  notes: z.string().trim().max(1000).optional(),
})

function toDayStart(value: Date) {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  return next
}

function toDayEnd(value: Date) {
  const next = new Date(value)
  next.setHours(23, 59, 59, 999)
  return next
}

function mapToSortedCategoryTotals(source: Map<string, number>) {
  return Array.from(source.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)) }))
}

function csvEscape(value: string | number) {
  const text = String(value ?? '')
  if (/[,"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

async function computeBalanceSnapshot(ownerId: string, params: { pgId?: string; periodStart: Date; periodEnd: Date }) {
  const periodStart = toDayStart(params.periodStart)
  const periodEnd = toDayEnd(params.periodEnd)

  const filter: Record<string, unknown> = {
    ownerId,
    entryDate: { $gte: periodStart, $lte: periodEnd },
  }

  if (params.pgId) {
    filter.pgId = params.pgId
  }

  const entries = await LedgerEntryModel.find(filter).sort({ entryDate: 1, createdAt: 1 }).lean()

  let totalIncome = 0
  let totalExpense = 0
  const incomeMap = new Map<string, number>()
  const expenseMap = new Map<string, number>()

  for (const entry of entries) {
    const amount = Number(entry.amount ?? 0)
    const category = String(entry.category ?? 'Other').trim() || 'Other'
    if (entry.entryType === 'income') {
      totalIncome += amount
      incomeMap.set(category, (incomeMap.get(category) ?? 0) + amount)
    } else {
      totalExpense += amount
      expenseMap.set(category, (expenseMap.get(category) ?? 0) + amount)
    }
  }

  return {
    periodStart,
    periodEnd,
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpense: Number(totalExpense.toFixed(2)),
    netBalance: Number((totalIncome - totalExpense).toFixed(2)),
    entriesCount: entries.length,
    incomeByCategory: mapToSortedCategoryTotals(incomeMap),
    expenseByCategory: mapToSortedCategoryTotals(expenseMap),
  }
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

router.post('/ledger/entries', auth('owner'), async (req: AuthedRequest, res) => {
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

  const parsed = ledgerEntryInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  if (parsed.data.pgId) {
    const isAssigned = await ensureAssignedPg(ownerId, parsed.data.pgId)
    if (!isAssigned) {
      res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
      return
    }
  }

  const item = await LedgerEntryModel.create({
    ownerId,
    entryType: parsed.data.entryType,
    category: parsed.data.category,
    amount: parsed.data.amount,
    entryDate: parsed.data.entryDate,
    ...(parsed.data.pgId ? { pgId: parsed.data.pgId } : {}),
    ...(parsed.data.residentName ? { residentName: parsed.data.residentName } : {}),
    ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
    source: 'individual',
    createdBy: ownerId,
  })

  res.status(201).json(item)
})

router.post('/ledger/entries/bulk', auth('owner'), async (req: AuthedRequest, res) => {
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

  const parsed = z.object({ entries: z.array(ledgerEntryInputSchema).min(1) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const pgIds = Array.from(new Set(parsed.data.entries.map((entry) => entry.pgId).filter(Boolean)))
  for (const pgId of pgIds) {
    if (!pgId) {
      continue
    }
    const isAssigned = await ensureAssignedPg(ownerId, pgId)
    if (!isAssigned) {
      res.status(403).json({ message: `Forbidden: PG ${pgId} is not assigned to this owner` })
      return
    }
  }

  const docs = parsed.data.entries.map((entry) => ({
    ...entry,
    ownerId,
    source: 'bulk',
    createdBy: ownerId,
  }))

  const inserted = await LedgerEntryModel.insertMany(docs)
  res.status(201).json({ insertedCount: inserted.length, items: inserted })
})

router.get('/ledger/entries', auth('owner'), async (req: AuthedRequest, res) => {
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

  const parsed = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(500).default(100),
      pgId: z.string().optional(),
      entryType: z.enum(['income', 'expense']).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    })
    .safeParse(req.query)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const { page, limit, pgId, entryType, startDate, endDate } = parsed.data

  if (pgId) {
    const isAssigned = await ensureAssignedPg(ownerId, pgId)
    if (!isAssigned) {
      res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
      return
    }
  }

  const filter: Record<string, unknown> = { ownerId }
  if (pgId) {
    filter.pgId = pgId
  }
  if (entryType) {
    filter.entryType = entryType
  }
  if (startDate || endDate) {
    filter.entryDate = {
      ...(startDate ? { $gte: toDayStart(startDate) } : {}),
      ...(endDate ? { $lte: toDayEnd(endDate) } : {}),
    }
  }

  const [items, totalItems] = await Promise.all([
    LedgerEntryModel.find(filter)
      .sort({ entryDate: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    LedgerEntryModel.countDocuments(filter),
  ])

  res.json({
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  })
})

router.delete('/ledger/entries/:id', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const item = await LedgerEntryModel.findOneAndDelete({
    _id: req.params.id,
    ownerId,
  } as Record<string, unknown>)

  if (!item) {
    res.status(404).json({ message: 'Ledger entry not found' })
    return
  }

  res.json({ message: 'Ledger entry deleted' })
})

router.post('/balance-sheets/generate', auth('owner'), async (req: AuthedRequest, res) => {
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

  const parsed = balanceSheetBaseSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  if (parsed.data.pgId) {
    const isAssigned = await ensureAssignedPg(ownerId, parsed.data.pgId)
    if (!isAssigned) {
      res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
      return
    }
  }

  if (parsed.data.periodEnd < parsed.data.periodStart) {
    res.status(400).json({ message: 'Period end must be greater than or equal to period start' })
    return
  }

  const snapshot = await computeBalanceSnapshot(ownerId, {
    ...(parsed.data.pgId ? { pgId: parsed.data.pgId } : {}),
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
  })

  res.json({
    title: parsed.data.title ?? 'Generated balance sheet',
    pgId: parsed.data.pgId ?? null,
    notes: parsed.data.notes ?? '',
    ...snapshot,
    lastGeneratedAt: new Date(),
  })
})

router.post('/balance-sheets', auth('owner'), async (req: AuthedRequest, res) => {
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

  const parsed = balanceSheetBaseSchema.extend({ title: z.string().trim().min(2).max(150) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  if (parsed.data.pgId) {
    const isAssigned = await ensureAssignedPg(ownerId, parsed.data.pgId)
    if (!isAssigned) {
      res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
      return
    }
  }

  if (parsed.data.periodEnd < parsed.data.periodStart) {
    res.status(400).json({ message: 'Period end must be greater than or equal to period start' })
    return
  }

  const snapshot = await computeBalanceSnapshot(ownerId, {
    ...(parsed.data.pgId ? { pgId: parsed.data.pgId } : {}),
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
  })

  const sheet = await BalanceSheetModel.create({
    ownerId,
    ...(parsed.data.pgId ? { pgId: parsed.data.pgId } : {}),
    title: parsed.data.title,
    notes: parsed.data.notes ?? '',
    createdBy: ownerId,
    lastGeneratedAt: new Date(),
    ...snapshot,
  })

  res.status(201).json(sheet)
})

router.get('/balance-sheets', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const parsed = z
    .object({
      pgId: z.string().optional(),
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(250).default(50),
    })
    .safeParse(req.query)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const { pgId, page, limit } = parsed.data
  if (pgId) {
    const isAssigned = await ensureAssignedPg(ownerId, pgId)
    if (!isAssigned) {
      res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
      return
    }
  }

  const filter: Record<string, unknown> = { ownerId }
  if (pgId) {
    filter.pgId = pgId
  }

  const [items, totalItems] = await Promise.all([
    BalanceSheetModel.find(filter)
      .populate('pgId', 'name area')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    BalanceSheetModel.countDocuments(filter),
  ])

  res.json({
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  })
})

router.get('/balance-sheets/:id', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const item = await BalanceSheetModel.findOne({
    _id: req.params.id,
    ownerId,
  } as Record<string, unknown>).populate('pgId', 'name area')

  if (!item) {
    res.status(404).json({ message: 'Balance sheet not found' })
    return
  }

  res.json(item)
})

router.delete('/balance-sheets/:id', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const item = await BalanceSheetModel.findOneAndDelete({
    _id: req.params.id,
    ownerId,
  } as Record<string, unknown>)

  if (!item) {
    res.status(404).json({ message: 'Balance sheet not found' })
    return
  }

  res.json({ message: 'Balance sheet deleted' })
})

router.get('/balance-sheets/:id/export', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const item = await BalanceSheetModel.findOne({
    _id: req.params.id,
    ownerId,
  } as Record<string, unknown>).populate('pgId', 'name area')

  if (!item) {
    res.status(404).json({ message: 'Balance sheet not found' })
    return
  }

  item.lastGeneratedAt = new Date() as unknown as never
  await item.save()

  const pgName = (item.pgId as unknown as { name?: string } | undefined)?.name ?? 'All PGs'
  const rows: string[] = []
  rows.push('Balance Sheet')
  rows.push(`Title,${csvEscape(item.title)}`)
  rows.push(`PG,${csvEscape(pgName)}`)
  rows.push(`Period Start,${csvEscape(item.periodStart.toISOString())}`)
  rows.push(`Period End,${csvEscape(item.periodEnd.toISOString())}`)
  rows.push(`Created At,${csvEscape(item.createdAt.toISOString())}`)
  rows.push(`Last Generated At,${csvEscape(item.lastGeneratedAt.toISOString())}`)
  rows.push('')
  rows.push('Totals')
  rows.push(`Total Income,${csvEscape(item.totalIncome)}`)
  rows.push(`Total Expense,${csvEscape(item.totalExpense)}`)
  rows.push(`Net Balance,${csvEscape(item.netBalance)}`)
  rows.push(`Entries Count,${csvEscape(item.entriesCount)}`)
  rows.push('')
  rows.push('Income Breakdown')
  rows.push('Category,Amount')
  for (const entry of item.incomeByCategory) {
    rows.push(`${csvEscape(entry.category)},${csvEscape(entry.amount)}`)
  }
  rows.push('')
  rows.push('Expense Breakdown')
  rows.push('Category,Amount')
  for (const entry of item.expenseByCategory) {
    rows.push(`${csvEscape(entry.category)},${csvEscape(entry.amount)}`)
  }

  const csv = `${rows.join('\n')}\n`
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename=balance-sheet-${item.id}.csv`)
  res.status(200).send(csv)
})

export default router
