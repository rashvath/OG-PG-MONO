import { Router } from 'express'
import { z } from 'zod'

import { auth, type AuthedRequest } from '../middleware/auth'
import { ListingModel } from '../models/Listing'

const router = Router()

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toAreaRegex(area: string) {
  const tokens = area
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => escapeRegex(token))
    .join('\\s+')

  return new RegExp(`^${tokens}$`, 'i')
}

router.get('/', async (req, res) => {
  const querySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(250).default(20),
    area: z.string().trim().optional(),
    gender: z.enum(['Men', 'Women', 'Co-ed']).optional(),
    maxBudget: z.coerce.number().optional(),
    sort: z.enum(['rec', 'lo', 'hi', 'rt']).default('rec'),
  })

  const parsed = querySchema.safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const { page, limit, area, gender, maxBudget, sort } = parsed.data

  const filter: Record<string, unknown> = { status: 'live' }
  if (area) {
    filter.area = toAreaRegex(area)
  }
  if (gender) filter.gender = gender
  if (typeof maxBudget === 'number' && Number.isFinite(maxBudget) && maxBudget > 0) {
    filter.baseRent = { $lte: maxBudget }
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    rec: { reviewCount: -1 },
    lo: { baseRent: 1 },
    hi: { baseRent: -1 },
    rt: { rating: -1 },
  }

  const [items, totalItems] = await Promise.all([
    ListingModel.find(filter)
      .sort(sortMap[sort])
      .skip((page - 1) * limit)
      .limit(limit),
    ListingModel.countDocuments(filter),
  ])

  const normalizedItems = items.map((listing) => {
    const sharingAvailability = (listing as unknown as { availabilityBySharing?: Array<{ sharing: string; availableBeds: number; totalBeds: number }> }).availabilityBySharing ?? []

    const availableSharing = new Set(
      sharingAvailability
        .filter((item) => Number(item.availableBeds ?? 0) > 0)
        .map((item) => item.sharing),
    )

    const roomTypes = (listing.roomTypes ?? []).filter((roomType) => {
      if (availableSharing.size === 0) {
        return true
      }

      const normalizedSharing = roomType.sharing === 'Four' ? 'Four' : roomType.sharing
      return availableSharing.has(normalizedSharing)
    })

    const raw = listing.toObject()
    return {
      ...raw,
      roomTypes,
      availabilityBySharing: sharingAvailability,
    }
  })

  res.json({
    items: normalizedItems,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
    },
  })
})

router.get('/:id', async (req, res) => {
  const listing = await ListingModel.findOne({ _id: req.params.id, status: 'live' })
  if (!listing) {
    res.status(404).json({ message: 'Listing not found' })
    return
  }

  const sharingAvailability = (listing as unknown as { availabilityBySharing?: Array<{ sharing: string; availableBeds: number; totalBeds: number }> }).availabilityBySharing ?? []
  const availableSharing = new Set(
    sharingAvailability
      .filter((item) => Number(item.availableBeds ?? 0) > 0)
      .map((item) => item.sharing),
  )

  const roomTypes = (listing.roomTypes ?? []).filter((roomType) => {
    if (availableSharing.size === 0) {
      return true
    }
    return availableSharing.has(roomType.sharing)
  })

  res.json({
    ...listing.toObject(),
    roomTypes,
    availabilityBySharing: sharingAvailability,
  })
})

router.post('/', auth('owner'), async (req: AuthedRequest, res) => {
  if (!req.user?.sub) {
    res.status(401).json({ message: 'Unauthorized' })
    return
  }

  res.status(403).json({
    message: 'Only admin can create PGs. Owners can manage details for assigned PGs.',
  })
})

export default router
