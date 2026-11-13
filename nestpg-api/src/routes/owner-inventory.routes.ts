import mongoose from 'mongoose'
import { Router } from 'express'
import { z } from 'zod'

import { env } from '../config/env'
import { auth, type AuthedRequest } from '../middleware/auth'
import { BedModel } from '../models/Bed'
import { FloorModel } from '../models/Floor'
import { ListingModel } from '../models/Listing'
import { OwnerProfileModel } from '../models/OwnerProfile'
import { PgOwnerAssignmentModel } from '../models/PgOwnerAssignment'
import { ResidentActivityModel } from '../models/ResidentActivity'
import { ResidentModel } from '../models/Resident'
import { RoomModel } from '../models/Room'
import { sendEmailReusable } from '../shared/email/send-email-reusable'

const router = Router()

const PHONE_10_REGEX = /^\d{10}$/

const roomTypeSchema = z.enum(['Single Sharing', 'Double Sharing', 'Triple Sharing', 'Four Sharing', 'Custom'])
const bedStatusSchema = z.enum(['vacant', 'reserved', 'occupied', 'maintenance'])
const layoutModeSchema = z.enum(['grid', 'custom'])

type BedStatus = z.infer<typeof bedStatusSchema>

function parseValidDateString(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

async function ensureApprovedOwner(ownerId: string) {
  const profile = await OwnerProfileModel.findOne({ userId: ownerId })
  return profile?.status === 'approved'
}

async function getAssignedPgIds(ownerId: string) {
  const assignments = await PgOwnerAssignmentModel.find({ ownerId }).select('pgId').lean()
  return assignments.map((item) => String(item.pgId))
}

async function ensureAssignedPg(ownerId: string, pgId: string) {
  const assigned = await PgOwnerAssignmentModel.findOne({ ownerId, pgId } as Record<string, unknown>)
  return Boolean(assigned)
}

function toSharingType(roomType: string): 'Single' | 'Double' | 'Triple' | 'Four' | 'Custom' {
  if (roomType === 'Single Sharing') return 'Single'
  if (roomType === 'Double Sharing') return 'Double'
  if (roomType === 'Triple Sharing') return 'Triple'
  if (roomType === 'Four Sharing') return 'Four'
  return 'Custom'
}

async function recomputeRoomOccupancy(roomId: string) {
  const [totalBeds, occupiedBeds] = await Promise.all([
    BedModel.countDocuments({ roomId }),
    BedModel.countDocuments({ roomId, status: 'occupied' }),
  ])

  await RoomModel.findByIdAndUpdate(roomId, {
    totalBeds,
    occupiedBeds,
  })
}

async function syncListingInventory(pgId: string) {
  const [totalBeds, occupiedBeds, availableBeds, totalRooms, totalFloors] = await Promise.all([
    BedModel.countDocuments({ pgId }),
    BedModel.countDocuments({ pgId, status: 'occupied' }),
    BedModel.countDocuments({ pgId, status: 'vacant' }),
    RoomModel.countDocuments({ pgId }),
    FloorModel.countDocuments({ pgId, isActive: true }),
  ])

  const rooms = await RoomModel.find({ pgId }).select('_id roomType').lean()
  const roomTypeMap = new Map<string, string>()
  rooms.forEach((room) => {
    roomTypeMap.set(String(room._id), room.roomType ?? 'Custom')
  })

  const beds = await BedModel.find({ pgId }).select('roomId status').lean()
  const sharingCounter = new Map<string, { availableBeds: number; totalBeds: number }>()

  for (const bed of beds) {
    const roomType = roomTypeMap.get(String(bed.roomId)) ?? 'Custom'
    const sharing = toSharingType(roomType)
    const current = sharingCounter.get(sharing) ?? { availableBeds: 0, totalBeds: 0 }
    current.totalBeds += 1
    if (bed.status === 'vacant') {
      current.availableBeds += 1
    }
    sharingCounter.set(sharing, current)
  }

  const availabilityBySharing = Array.from(sharingCounter.entries()).map(([sharing, item]) => ({
    sharing,
    availableBeds: item.availableBeds,
    totalBeds: item.totalBeds,
  }))

  await ListingModel.findByIdAndUpdate(pgId, {
    totalBeds,
    occupiedBeds,
    availableBeds,
    totalRooms,
    totalFloors,
    availabilityBySharing,
  })
}

async function sendTenantRegistrationInvite(payload: {
  email: string
  fullName: string
  pgName: string
}) {
  if (!env.gmailUser || !env.gmailAppPassword) {
    return
  }

  await sendEmailReusable(
    {
      to: payload.email,
      subject: `Complete your tenant registration for ${payload.pgName}`,
      text: `Hi ${payload.fullName},\n\nYou have been added as a tenant for ${payload.pgName}. Please register at the tenant portal using this same email and select this PG. Your tenant login is enabled after owner/admin approval.\n\n- OG PG Team`,
      html: `<p>Hi ${payload.fullName},</p><p>You have been added as a tenant for <strong>${payload.pgName}</strong>.</p><p>Please register at the tenant portal using this same email and select this PG.</p><p>Your tenant login is enabled after owner/admin approval.</p><p>- OG PG Team</p>`,
    },
    {
      user: env.gmailUser,
      appPassword: env.gmailAppPassword,
      ...(env.gmailFrom ? { from: env.gmailFrom } : {}),
    },
  )
}

async function buildInventoryPayload(pgId: string, filters?: {
  floorId?: string
  status?: BedStatus
  roomType?: string
  search?: string
  onlyWithAvailableBeds?: boolean
}) {
  const floorFilter: Record<string, unknown> = { pgId, isActive: true }
  const roomFilter: Record<string, unknown> = { pgId }

  if (filters?.floorId) {
    roomFilter.floorId = filters.floorId
  }
  if (filters?.roomType) {
    roomFilter.roomType = filters.roomType
  }
  if (filters?.search) {
    roomFilter.roomNumber = { $regex: filters.search, $options: 'i' }
  }

  const floors = await FloorModel.find(floorFilter).sort({ sortOrder: 1, level: 1, createdAt: 1 }).lean()
  const rooms = await RoomModel.find(roomFilter).sort({ floorNumber: 1, customOrder: 1, roomNumber: 1 }).lean()

  const roomIds = rooms.map((room) => room._id)
  const allBeds = await BedModel.find({ roomId: { $in: roomIds } }).sort({ bedNumber: 1, bedLabel: 1 }).lean()
  const visibleBeds = filters?.status ? allBeds.filter((bed) => bed.status === filters.status) : allBeds

  const allBedsByRoom = new Map<string, Array<typeof allBeds[number]>>()
  for (const bed of allBeds) {
    const key = String(bed.roomId)
    const list = allBedsByRoom.get(key) ?? []
    list.push(bed)
    allBedsByRoom.set(key, list)
  }

  const visibleBedsByRoom = new Map<string, Array<typeof visibleBeds[number]>>()
  for (const bed of visibleBeds) {
    const key = String(bed.roomId)
    const list = visibleBedsByRoom.get(key) ?? []
    list.push(bed)
    visibleBedsByRoom.set(key, list)
  }

  const roomRows = rooms
    .map((room) => {
      const roomAllBeds = allBedsByRoom.get(String(room._id)) ?? []
      const roomVisibleBeds = visibleBedsByRoom.get(String(room._id)) ?? roomAllBeds
      const occupied = roomAllBeds.filter((bed) => bed.status === 'occupied').length
      const vacant = roomAllBeds.filter((bed) => bed.status === 'vacant').length
      const reserved = roomAllBeds.filter((bed) => bed.status === 'reserved').length
      const maintenance = roomAllBeds.filter((bed) => bed.status === 'maintenance').length

      const floor = floors.find((item) => String(item._id) === String(room.floorId))

      return {
        ...room,
        floorName: floor?.name ?? room.floorName ?? `Floor ${room.floorNumber}`,
        beds: roomVisibleBeds,
        occupancy: {
          occupied,
          vacant,
          reserved,
          maintenance,
          total: roomAllBeds.length,
        },
      }
    })
    .filter((room) => {
      if (!filters?.onlyWithAvailableBeds) {
        return true
      }
      return room.occupancy.vacant > 0
    })

  const [totalFloors, totalRooms, totalBeds, vacantBeds, occupiedBeds, reservedBeds, maintenanceBeds] = await Promise.all([
    FloorModel.countDocuments({ pgId, isActive: true }),
    RoomModel.countDocuments({ pgId }),
    BedModel.countDocuments({ pgId }),
    BedModel.countDocuments({ pgId, status: 'vacant' }),
    BedModel.countDocuments({ pgId, status: 'occupied' }),
    BedModel.countDocuments({ pgId, status: 'reserved' }),
    BedModel.countDocuments({ pgId, status: 'maintenance' }),
  ])

  return {
    stats: {
      totalFloors,
      totalRooms,
      totalBeds,
      availableBeds: vacantBeds,
      occupiedBeds,
      reservedBeds,
      maintenanceBeds,
      occupancyPercentage: totalBeds > 0 ? Number(((occupiedBeds / totalBeds) * 100).toFixed(1)) : 0,
    },
    floors,
    rooms: roomRows,
  }
}

router.get('/pgs/:pgId/inventory', auth('owner'), async (req: AuthedRequest, res) => {
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

  const pgId = String(req.params.pgId)
  const isAssigned = await ensureAssignedPg(ownerId, pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const parsed = z
    .object({
      floorId: z.string().optional(),
      bedStatus: bedStatusSchema.optional(),
      roomType: roomTypeSchema.optional(),
      search: z.string().trim().optional(),
      onlyWithAvailableBeds: z.coerce.boolean().optional(),
    })
    .safeParse(req.query)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  if (parsed.data.floorId && !/^[a-f\d]{24}$/i.test(parsed.data.floorId)) {
    res.status(400).json({ message: 'floorId must be a valid id' })
    return
  }

  const payload = await buildInventoryPayload(pgId, {
    ...(parsed.data.floorId ? { floorId: parsed.data.floorId } : {}),
    ...(parsed.data.bedStatus ? { status: parsed.data.bedStatus } : {}),
    ...(parsed.data.roomType ? { roomType: parsed.data.roomType } : {}),
    ...(parsed.data.search ? { search: parsed.data.search } : {}),
    ...(parsed.data.onlyWithAvailableBeds !== undefined ? { onlyWithAvailableBeds: parsed.data.onlyWithAvailableBeds } : {}),
  })

  res.json(payload)
})

router.post('/pgs/:pgId/floors', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pgId = String(req.params.pgId)
  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const isAssigned = await ensureAssignedPg(ownerId, pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const parsed = z
    .object({
      name: z.string().trim().min(2).max(60),
      level: z.number().int().nonnegative().optional(),
      sortOrder: z.number().int().optional(),
      layoutMode: layoutModeSchema.optional(),
      gridColumns: z.number().int().min(2).max(12).optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const maxLevel = await FloorModel.findOne({ pgId }).sort({ level: -1 }).select('level').lean()
  const nextLevel = (maxLevel?.level ?? -1) + 1

  try {
    const floor = await FloorModel.create({
      pgId,
      name: parsed.data.name,
      level: parsed.data.level ?? nextLevel,
      sortOrder: parsed.data.sortOrder ?? parsed.data.level ?? nextLevel,
      layoutMode: parsed.data.layoutMode ?? 'grid',
      gridColumns: parsed.data.gridColumns ?? 6,
      isActive: true,
    })

    await syncListingInventory(pgId)
    res.status(201).json(floor)
  } catch {
    res.status(409).json({ message: 'Floor name or level already exists for this PG' })
  }
})

router.patch('/pgs/:pgId/floors/:floorId', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pgId = String(req.params.pgId)
  const floorId = String(req.params.floorId)
  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const isAssigned = await ensureAssignedPg(ownerId, pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const parsed = z
    .object({
      name: z.string().trim().min(2).max(60).optional(),
      level: z.number().int().nonnegative().optional(),
      sortOrder: z.number().int().optional(),
      layoutMode: layoutModeSchema.optional(),
      gridColumns: z.number().int().min(2).max(12).optional(),
      isActive: z.boolean().optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  try {
    const floor = await FloorModel.findOneAndUpdate({ _id: floorId, pgId }, parsed.data, { new: true })
    if (!floor) {
      res.status(404).json({ message: 'Floor not found' })
      return
    }

    if (parsed.data.name || parsed.data.level !== undefined) {
      const rooms = await RoomModel.find({ floorId: floor._id, pgId })
      await Promise.all(
        rooms.map((room) =>
          RoomModel.findByIdAndUpdate(room._id, {
            ...(parsed.data.name ? { floorName: parsed.data.name } : {}),
            ...(parsed.data.level !== undefined ? { floorNumber: parsed.data.level } : {}),
          }),
        ),
      )
    }

    await syncListingInventory(pgId)
    res.json(floor)
  } catch {
    res.status(409).json({ message: 'Floor name or level already exists for this PG' })
  }
})

router.delete('/pgs/:pgId/floors/:floorId', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pgId = String(req.params.pgId)
  const floorId = String(req.params.floorId)
  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const isAssigned = await ensureAssignedPg(ownerId, pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const roomCount = await RoomModel.countDocuments({ pgId, floorId })
  if (roomCount > 0) {
    res.status(409).json({ message: 'Cannot delete floor with existing rooms' })
    return
  }

  const deleted = await FloorModel.findOneAndDelete({ _id: floorId, pgId })
  if (!deleted) {
    res.status(404).json({ message: 'Floor not found' })
    return
  }

  await syncListingInventory(pgId)
  res.json({ message: 'Floor deleted' })
})

router.post('/pgs/:pgId/rooms', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pgId = String(req.params.pgId)
  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const isAssigned = await ensureAssignedPg(ownerId, pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const parsed = z
    .object({
      floorId: z.string(),
      roomNumber: z.string().trim().min(1).max(20),
      roomType: roomTypeSchema,
      totalBedCapacity: z.number().int().positive().max(30),
      monthlyRent: z.number().nonnegative().default(0),
      bathroomType: z.enum(['attached', 'common']).default('common'),
      acType: z.enum(['ac', 'non-ac']).default('non-ac'),
      description: z.string().trim().max(400).optional(),
      status: z.enum(['active', 'maintenance', 'inactive']).default('active'),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const floor = await FloorModel.findOne({ _id: parsed.data.floorId, pgId, isActive: true })
  if (!floor) {
    res.status(404).json({ message: 'Floor not found' })
    return
  }

  const lastRoomInFloor = await RoomModel.findOne({ pgId, floorId: floor._id })
    .sort({ customOrder: -1, createdAt: -1 })
    .select('customOrder')
    .lean()
  const nextCustomOrder = (lastRoomInFloor?.customOrder ?? -1) + 1

  const existingRoom = await RoomModel.findOne({ pgId, roomNumber: parsed.data.roomNumber })
  if (existingRoom) {
    res.status(409).json({ message: 'Room number must be unique within this property' })
    return
  }

  const session = await mongoose.startSession()
  let roomId = ''
  try {
    await session.withTransaction(async () => {
      const room = await RoomModel.create(
        [
          {
            pgId,
            floorId: floor._id,
            floorNumber: floor.level,
            floorName: floor.name,
            roomNumber: parsed.data.roomNumber,
            roomType: parsed.data.roomType,
            totalBeds: parsed.data.totalBedCapacity,
            occupiedBeds: 0,
            monthlyRent: parsed.data.monthlyRent,
            bathroomType: parsed.data.bathroomType,
            acType: parsed.data.acType,
            description: parsed.data.description ?? '',
            status: parsed.data.status,
            customOrder: nextCustomOrder,
          },
        ],
        { session },
      )

      const createdRoom = room[0]
      if (!createdRoom) {
        throw new Error('Unable to create room')
      }
      roomId = String(createdRoom._id)

      const bedsToCreate = Array.from({ length: parsed.data.totalBedCapacity }).map((_, index) => ({
        pgId,
        roomId: createdRoom._id,
        bedLabel: `B${String(index + 1).padStart(2, '0')}`,
        bedNumber: index + 1,
        status: 'vacant',
        monthlyRent: parsed.data.monthlyRent,
      }))

      if (bedsToCreate.length > 0) {
        await BedModel.insertMany(bedsToCreate, { session })
      }
    })
  } catch {
    await session.endSession()
    res.status(500).json({ message: 'Unable to create room' })
    return
  }
  await session.endSession()

  await recomputeRoomOccupancy(roomId)
  await syncListingInventory(pgId)

  const updatedRoom = await RoomModel.findById(roomId).lean()
  res.status(201).json(updatedRoom)
})

router.patch('/pgs/:pgId/rooms/:roomId', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pgId = String(req.params.pgId)
  const roomId = String(req.params.roomId)
  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const isAssigned = await ensureAssignedPg(ownerId, pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const parsed = z
    .object({
      floorId: z.string().optional(),
      roomNumber: z.string().trim().min(1).max(20).optional(),
      roomType: roomTypeSchema.optional(),
      totalBedCapacity: z.number().int().positive().max(30).optional(),
      monthlyRent: z.number().nonnegative().optional(),
      bathroomType: z.enum(['attached', 'common']).optional(),
      acType: z.enum(['ac', 'non-ac']).optional(),
      description: z.string().trim().max(400).optional(),
      status: z.enum(['active', 'maintenance', 'inactive']).optional(),
      customOrder: z.number().int().nonnegative().optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const room = await RoomModel.findOne({ _id: roomId, pgId })
  if (!room) {
    res.status(404).json({ message: 'Room not found' })
    return
  }

  if (parsed.data.roomNumber && parsed.data.roomNumber !== room.roomNumber) {
    const duplicateRoom = await RoomModel.findOne({ pgId, roomNumber: parsed.data.roomNumber })
    if (duplicateRoom) {
      res.status(409).json({ message: 'Room number must be unique within this property' })
      return
    }
  }

  if (parsed.data.floorId) {
    const floor = await FloorModel.findOne({ _id: parsed.data.floorId, pgId, isActive: true })
    if (!floor) {
      res.status(404).json({ message: 'Floor not found' })
      return
    }
    room.floorId = floor._id
    room.floorNumber = floor.level
    room.floorName = floor.name
  }

  const requestedCapacity = parsed.data.totalBedCapacity
  if (requestedCapacity !== undefined && requestedCapacity !== room.totalBeds) {
    const existingBeds = await BedModel.find({ roomId: room._id }).sort({ bedNumber: 1, createdAt: 1 })
    if (requestedCapacity > existingBeds.length) {
      const newBeds = Array.from({ length: requestedCapacity - existingBeds.length }).map((_, idx) => {
        const bedNumber = existingBeds.length + idx + 1
        return {
          pgId,
          roomId: room._id,
          bedLabel: `B${String(bedNumber).padStart(2, '0')}`,
          bedNumber,
          status: 'vacant',
          monthlyRent: parsed.data.monthlyRent ?? room.monthlyRent ?? 0,
        }
      })
      if (newBeds.length > 0) {
        await BedModel.insertMany(newBeds)
      }
    } else {
      const removeCount = existingBeds.length - requestedCapacity
      const removableBeds = existingBeds.slice(-removeCount)
      const removableBedIds = removableBeds.map((bed) => String(bed._id))

      const [activeAssignmentsCount, bedsNotVacantCount, anyHistoryCount] = await Promise.all([
        ResidentModel.countDocuments({ bedId: { $in: removableBedIds }, status: { $in: ['active', 'pending_verification', 'notice_period'] } } as Record<string, unknown>),
        BedModel.countDocuments({ _id: { $in: removableBedIds }, status: { $ne: 'vacant' } }),
        ResidentModel.countDocuments({ bedId: { $in: removableBedIds } }),
      ])

      if (activeAssignmentsCount > 0 || bedsNotVacantCount > 0 || anyHistoryCount > 0) {
        res.status(409).json({
          message: 'Cannot remove beds with active occupancy, non-vacant status, or tenant history',
        })
        return
      }

      if (removableBedIds.length > 0) {
        await BedModel.deleteMany({ _id: { $in: removableBedIds } })
      }
    }
  }

  if (parsed.data.roomNumber) room.roomNumber = parsed.data.roomNumber
  if (parsed.data.roomType) room.roomType = parsed.data.roomType
  if (parsed.data.monthlyRent !== undefined) room.monthlyRent = parsed.data.monthlyRent
  if (parsed.data.bathroomType) room.bathroomType = parsed.data.bathroomType
  if (parsed.data.acType) room.acType = parsed.data.acType
  if (parsed.data.description !== undefined) room.description = parsed.data.description
  if (parsed.data.status) room.status = parsed.data.status
  if (parsed.data.customOrder !== undefined) room.customOrder = parsed.data.customOrder

  await room.save()

  if (parsed.data.monthlyRent !== undefined) {
    await BedModel.updateMany({ roomId: room._id, status: { $in: ['vacant', 'reserved'] } }, { monthlyRent: parsed.data.monthlyRent })
  }

  await recomputeRoomOccupancy(String(room._id))
  await syncListingInventory(pgId)

  const updatedRoom = await RoomModel.findById(room._id).lean()
  res.json(updatedRoom)
})

router.delete('/pgs/:pgId/rooms/:roomId', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pgId = String(req.params.pgId)
  const roomId = String(req.params.roomId)
  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const isAssigned = await ensureAssignedPg(ownerId, pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const room = await RoomModel.findOne({ _id: roomId, pgId })
  if (!room) {
    res.status(404).json({ message: 'Room not found' })
    return
  }

  const bedIds = (await BedModel.find({ roomId }).select('_id').lean()).map((item) => String(item._id))

  const activeAssignmentCount = await ResidentModel.countDocuments({
    roomId,
    status: { $in: ['active', 'pending_verification', 'notice_period'] },
  } as Record<string, unknown>)

  if (activeAssignmentCount > 0) {
    res.status(409).json({ message: 'Cannot delete room with active tenant assignments' })
    return
  }

  const historyCount = await ResidentModel.countDocuments({ bedId: { $in: bedIds } })
  if (historyCount > 0) {
    res.status(409).json({ message: 'Cannot delete room with historical tenant assignment records' })
    return
  }

  const session = await mongoose.startSession()
  try {
    await session.withTransaction(async () => {
      await BedModel.deleteMany({ roomId }).session(session)
      await RoomModel.deleteOne({ _id: room._id }).session(session)
    })
  } catch {
    await session.endSession()
    res.status(500).json({ message: 'Unable to delete room' })
    return
  }
  await session.endSession()

  await syncListingInventory(pgId)
  res.json({ message: 'Room deleted' })
})

router.patch('/pgs/:pgId/beds/:bedId/status', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pgId = String(req.params.pgId)
  const bedId = String(req.params.bedId)
  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const isAssigned = await ensureAssignedPg(ownerId, pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const parsed = z
    .object({
      status: bedStatusSchema,
      maintenanceReason: z.string().trim().max(200).optional(),
      reservedForName: z.string().trim().max(80).optional(),
      reservedForPhone: z.string().trim().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits').optional(),
      expectedMoveInDate: z.string().optional(),
      expectedVacatingDate: z.string().optional(),
      monthlyRent: z.number().nonnegative().optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  if (parsed.data.expectedMoveInDate && !parseValidDateString(parsed.data.expectedMoveInDate)) {
    res.status(400).json({ message: 'expectedMoveInDate must be a valid date' })
    return
  }

  if (parsed.data.expectedVacatingDate && !parseValidDateString(parsed.data.expectedVacatingDate)) {
    res.status(400).json({ message: 'expectedVacatingDate must be a valid date' })
    return
  }

  const bed = await BedModel.findOne({ _id: bedId, pgId })
  if (!bed) {
    res.status(404).json({ message: 'Bed not found' })
    return
  }

  const activeResident = await ResidentModel.findOne({
    bedId,
    status: { $in: ['active', 'pending_verification', 'notice_period'] },
  } as Record<string, unknown>)

  if (parsed.data.status === 'occupied' && !activeResident) {
    res.status(409).json({ message: 'Cannot mark bed occupied without an active tenant assignment' })
    return
  }

  if (parsed.data.status !== 'occupied' && activeResident) {
    res.status(409).json({ message: 'Cannot change bed status while an active tenant is assigned' })
    return
  }

  if (parsed.data.status === 'reserved' && !parsed.data.reservedForName) {
    res.status(400).json({ message: 'reservedForName is required when marking a bed reserved' })
    return
  }

  bed.status = parsed.data.status
  if (parsed.data.monthlyRent !== undefined) {
    bed.monthlyRent = parsed.data.monthlyRent
  }

  bed.maintenanceReason = parsed.data.status === 'maintenance' ? parsed.data.maintenanceReason ?? '' : ''

  if (parsed.data.status === 'reserved') {
    bed.reservedForName = parsed.data.reservedForName ?? ''
    bed.reservedForPhone = parsed.data.reservedForPhone ?? ''
    bed.reservedByUserId = new mongoose.Types.ObjectId(ownerId)
    bed.reservedAt = new Date()
    bed.expectedMoveInDate = parsed.data.expectedMoveInDate ? parseValidDateString(parsed.data.expectedMoveInDate) : null
    bed.expectedVacatingDate = parsed.data.expectedVacatingDate ? parseValidDateString(parsed.data.expectedVacatingDate) : null
  } else {
    bed.reservedForName = ''
    bed.reservedForPhone = ''
    bed.reservedByUserId = null
    bed.reservedAt = null
    bed.expectedMoveInDate = null
    bed.expectedVacatingDate = null
  }

  await bed.save()
  await recomputeRoomOccupancy(String(bed.roomId))
  await syncListingInventory(pgId)

  res.json(bed)
})

router.post('/pgs/:pgId/beds/:bedId/assign-tenant', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pgId = String(req.params.pgId)
  const bedId = String(req.params.bedId)
  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const isAssigned = await ensureAssignedPg(ownerId, pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const parsed = z
    .object({
      fullName: z.string().trim().min(2),
      phone: z.string().trim().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits'),
      email: z.string().trim().email().optional(),
      joiningDate: z.string(),
      expectedExitDate: z.string().optional(),
      rent: z.number().nonnegative(),
      deposit: z.number().nonnegative().default(0),
      amountPaid: z.number().nonnegative().default(0),
      paymentStatus: z.enum(['pending', 'partial', 'paid']).default('pending'),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const joiningDate = parseValidDateString(parsed.data.joiningDate)
  if (!joiningDate) {
    res.status(400).json({ message: 'joiningDate must be a valid date' })
    return
  }

  const expectedExitDate = parsed.data.expectedExitDate ? parseValidDateString(parsed.data.expectedExitDate) : null
  if (parsed.data.expectedExitDate && !expectedExitDate) {
    res.status(400).json({ message: 'expectedExitDate must be a valid date' })
    return
  }

  const session = await mongoose.startSession()
  try {
    let createdResidentId = ''

    await session.withTransaction(async () => {
      const bed = await BedModel.findOne({ _id: bedId, pgId }).session(session)
      if (!bed) {
        throw new Error('Bed not found')
      }

      if (!['vacant', 'reserved'].includes(bed.status)) {
        throw new Error('Bed is not available for assignment')
      }

      const activeForBed = await ResidentModel.findOne({
        bedId,
        status: { $in: ['active', 'pending_verification', 'notice_period'] },
      } as Record<string, unknown>).session(session)

      if (activeForBed) {
        throw new Error('Bed already has an active tenant assignment')
      }

      const room = await RoomModel.findById(bed.roomId).session(session)
      if (!room) {
        throw new Error('Room not found for selected bed')
      }

      const amountDue = Math.max(parsed.data.rent - parsed.data.amountPaid, 0)

      const created = new ResidentModel({
        ownerId,
        pgId,
        roomId: room._id,
        bedId: bed._id,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        email: parsed.data.email ?? '',
        joiningDate,
        ...(expectedExitDate ? { expectedExitDate } : {}),
        rent: parsed.data.rent,
        deposit: parsed.data.deposit,
        amountPaid: parsed.data.amountPaid,
        amountDue,
        paymentStatus: parsed.data.paymentStatus,
        status: 'active',
      })

      await created.save({ session })
      createdResidentId = String(created._id)

      bed.status = 'occupied'
      bed.monthlyRent = parsed.data.rent
      bed.reservedForName = ''
      bed.reservedForPhone = ''
      bed.reservedByUserId = null
      bed.reservedAt = null
      bed.expectedMoveInDate = null
      bed.expectedVacatingDate = expectedExitDate
      await bed.save({ session })

      await ResidentActivityModel.create(
        [
          {
            residentId: createdResidentId,
            ownerId,
            activityType: 'resident_added',
            message: `${parsed.data.fullName} assigned to bed ${bed.bedLabel}`,
            metadata: { pgId, roomId: String(room._id), bedId },
          },
        ],
        { session },
      )
    })

    const bedAfterAssignment = await BedModel.findById(bedId).select('roomId').lean()
    if (bedAfterAssignment?.roomId) {
      await recomputeRoomOccupancy(String(bedAfterAssignment.roomId))
    }
    await syncListingInventory(pgId)

    const resident = await ResidentModel.findById(createdResidentId)

    if (parsed.data.email) {
      const listing = await ListingModel.findById(pgId).select('name').lean()
      await sendTenantRegistrationInvite({
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        pgName: listing?.name ?? 'your selected PG',
      })
    }

    res.status(201).json(resident)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to assign tenant'
    if (message === 'Bed not found' || message === 'Room not found for selected bed') {
      res.status(404).json({ message })
      return
    }
    if (message === 'Bed is not available for assignment' || message === 'Bed already has an active tenant assignment') {
      res.status(409).json({ message })
      return
    }
    res.status(500).json({ message: 'Unable to assign tenant' })
  } finally {
    await session.endSession()
  }
})

router.post('/pgs/:pgId/beds/:bedId/vacate', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pgId = String(req.params.pgId)
  const bedId = String(req.params.bedId)
  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const isAssigned = await ensureAssignedPg(ownerId, pgId)
  if (!isAssigned) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const parsed = z
    .object({
      leavingDate: z.string(),
      reason: z.string().trim().optional(),
      finalSettlementAmount: z.number().nonnegative().default(0),
      finalSettlementPaid: z.boolean().default(false),
      notes: z.string().trim().optional(),
      finalRoomCondition: z.string().trim().optional(),
    })
    .safeParse(req.body)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const leavingDate = parseValidDateString(parsed.data.leavingDate)
  if (!leavingDate) {
    res.status(400).json({ message: 'leavingDate must be a valid date' })
    return
  }

  const resident = await ResidentModel.findOne({
    ownerId,
    pgId,
    bedId,
    status: { $in: ['active', 'pending_verification', 'notice_period'] },
  } as Record<string, unknown>)

  if (!resident) {
    res.status(404).json({ message: 'Active resident assignment not found for this bed' })
    return
  }

  const session = await mongoose.startSession()
  let roomIdForSync = ''
  try {
    await session.withTransaction(async () => {
      resident.status = 'left'
      resident.actualExitDate = leavingDate
      resident.leavingReason = parsed.data.reason ?? ''
      resident.finalSettlementAmount = parsed.data.finalSettlementAmount as unknown as never
      resident.finalSettlementPaid = parsed.data.finalSettlementPaid as unknown as never
      resident.finalSettlementPaidAt = parsed.data.finalSettlementPaid ? (new Date() as unknown as never) : null
      resident.exitNotes = parsed.data.notes ?? ''
      resident.finalRoomCondition = parsed.data.finalRoomCondition ?? ''
      await resident.save({ session })

      const bed = await BedModel.findOne({ _id: bedId, pgId }).session(session)
      if (bed) {
        bed.status = 'vacant'
        bed.maintenanceReason = ''
        bed.reservedForName = ''
        bed.reservedForPhone = ''
        bed.reservedByUserId = null
        bed.reservedAt = null
        bed.expectedMoveInDate = null
        bed.expectedVacatingDate = null
        roomIdForSync = String(bed.roomId)
        await bed.save({ session })
      }

      await ResidentActivityModel.create(
        [{
          residentId: resident.id,
          ownerId,
          activityType: 'resident_left',
          message: `${resident.fullName} vacated bed`,
          metadata: {
            pgId,
            bedId,
            leavingDate: parsed.data.leavingDate,
            reason: parsed.data.reason ?? '',
          },
        }],
        { session },
      )
    })
  } catch {
    await session.endSession()
    res.status(500).json({ message: 'Unable to vacate bed' })
    return
  }
  await session.endSession()

  if (roomIdForSync) {
    await recomputeRoomOccupancy(roomIdForSync)
  }
  await syncListingInventory(pgId)

  res.json(resident)
})

router.get('/pgs/:pgId/rooms', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  const pgId = String(req.params.pgId)
  const approved = await ensureApprovedOwner(ownerId)
  if (!approved) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return
  }

  const assignedPgIds = await getAssignedPgIds(ownerId)
  if (!assignedPgIds.includes(pgId)) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return
  }

  const parsed = z
    .object({
      floorId: z.string().optional(),
      bedStatus: bedStatusSchema.optional(),
      roomType: roomTypeSchema.optional(),
      search: z.string().trim().optional(),
      onlyWithAvailableBeds: z.coerce.boolean().optional(),
    })
    .safeParse(req.query)

  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  if (parsed.data.floorId && !/^[a-f\d]{24}$/i.test(parsed.data.floorId)) {
    res.status(400).json({ message: 'floorId must be a valid id' })
    return
  }

  const payload = await buildInventoryPayload(pgId, {
    ...(parsed.data.floorId ? { floorId: parsed.data.floorId } : {}),
    ...(parsed.data.bedStatus ? { status: parsed.data.bedStatus } : {}),
    ...(parsed.data.roomType ? { roomType: parsed.data.roomType } : {}),
    ...(parsed.data.search ? { search: parsed.data.search } : {}),
    ...(parsed.data.onlyWithAvailableBeds !== undefined ? { onlyWithAvailableBeds: parsed.data.onlyWithAvailableBeds } : {}),
  })

  res.json({ rooms: payload.rooms, stats: payload.stats })
})

export default router
