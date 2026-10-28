import bcrypt from 'bcryptjs'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

import { env } from '../config/env'
import { auth, type AuthedRequest } from '../middleware/auth'
import { OwnerApplicationModel } from '../models/OwnerApplication'
import { OwnerProfileModel } from '../models/OwnerProfile'
import { UserModel } from '../models/User'

const router = Router()

const PHONE_10_REGEX = /^\d{10}$/

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

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits'),
  password: z.string().min(6),
  role: z.enum(['customer', 'owner']).default('customer'),
  pgName: z.string().optional(),
  pgAddress: z.string().optional(),
  area: z.string().optional(),
  description: z.string().optional(),
  numberOfRooms: z.number().optional(),
  photos: z.array(z.string()).optional(),
  rent: z.number().optional(),
  amenities: z.array(z.string()).optional(),
})

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const existing = await UserModel.findOne({ email: parsed.data.email.toLowerCase() })
  if (existing) {
    res.status(409).json({ message: 'Email already exists' })
    return
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  const user = await UserModel.create({
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    phone: parsed.data.phone,
    role: parsed.data.role,
    passwordHash,
  })

  if (parsed.data.role === 'owner') {
    const ownerPayloadSchema = z.object({
      pgName: z.string().min(2),
      pgAddress: z.string().min(2),
      area: areaSchema,
      description: z.string().default(''),
      numberOfRooms: z.number().int().nonnegative().default(0),
      photos: z
        .array(z.string())
        .default([])
        .transform((photos) => sanitizeImageUrls(photos))
        .refine((photos) => photos.length <= 5, 'You can add at most 5 valid image URLs'),
      rent: z.number().positive(),
      amenities: z.array(z.string()).default([]),
    })

    const ownerData = ownerPayloadSchema.safeParse(parsed.data)
    if (!ownerData.success) {
      await UserModel.findByIdAndDelete(user.id)
      res.status(400).json({ message: ownerData.error.flatten() })
      return
    }

    await OwnerProfileModel.create({
      userId: user.id,
      phone: parsed.data.phone,
      status: 'pending',
      mustChangePassword: false,
    })

    await OwnerApplicationModel.create({
      ownerUserId: user.id,
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      mobile: parsed.data.phone,
      pgName: ownerData.data.pgName,
      pgAddress: ownerData.data.pgAddress,
      area: ownerData.data.area,
      description: ownerData.data.description,
      numberOfRooms: ownerData.data.numberOfRooms,
      photos: ownerData.data.photos,
      rent: ownerData.data.rent,
      amenities: ownerData.data.amenities,
      status: 'pending',
    })

    res.status(201).json({
      id: user.id,
      status: 'pending_approval',
      message: 'Owner registration submitted and pending admin approval.',
    })
    return
  }

  res.status(201).json({ id: user.id })
})

router.post('/login', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(6) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase() })
  if (!user) {
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!ok || user.status === 'blocked') {
    res.status(401).json({ message: 'Invalid credentials' })
    return
  }

  if (user.role === 'owner') {
    const ownerProfile = await OwnerProfileModel.findOne({ userId: user.id })
    if (!ownerProfile || ownerProfile.status !== 'approved') {
      res.status(403).json({ message: 'Owner account is pending admin approval.' })
      return
    }
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: '1h' })
  res.json({ token, user: { id: user.id, role: user.role, name: user.name } })
})

router.get('/me', auth(), async (req: AuthedRequest, res) => {
  const user = await UserModel.findById(req.user?.sub).select('-passwordHash')
  if (!user) {
    res.status(404).json({ message: 'User not found' })
    return
  }
  res.json(user)
})

export default router
