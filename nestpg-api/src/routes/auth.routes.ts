import bcrypt from 'bcryptjs'
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'

import { env } from '../config/env'
import { auth, type AuthedRequest } from '../middleware/auth'
import { ListingModel } from '../models/Listing'
import { OwnerApplicationModel } from '../models/OwnerApplication'
import { OwnerProfileModel } from '../models/OwnerProfile'
import { PgOwnerAssignmentModel } from '../models/PgOwnerAssignment'
import { OtpModel } from '../models/Otp'
import { UserModel } from '../models/User'
import { createAndSendOtp, OtpDeliveryError, verifyOtp } from '../utils/otpUtils'

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
  otpCode: z.string().trim().min(1),
  phone: z.string().regex(PHONE_10_REGEX, 'Mobile number must be exactly 10 digits'),
  password: z.string().min(6),
  role: z.enum(['customer', 'owner', 'tenant']).default('customer'),
  pgId: z.string().optional(),
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

  const otpVerification = await verifyOtp(parsed.data.email, 'registration', parsed.data.otpCode)
  if (!otpVerification.valid) {
    res.status(400).json({ message: otpVerification.reason })
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

    await OtpModel.deleteMany({ email: parsed.data.email.toLowerCase(), purpose: 'registration' })
    res.status(201).json({
      id: user.id,
      status: 'pending_approval',
      message: 'Owner registration submitted and pending admin approval.',
    })
    return
  }

  if (parsed.data.role === 'tenant') {
    if (!parsed.data.pgId) {
      await UserModel.findByIdAndDelete(user.id)
      res.status(400).json({ message: 'PG selection is required for tenant registration' })
      return
    }

    const listing = await ListingModel.findOne({ _id: parsed.data.pgId, status: 'live' }).select('name').lean()
    if (!listing) {
      await UserModel.findByIdAndDelete(user.id)
      res.status(404).json({ message: 'Selected PG not found' })
      return
    }

    const assignment = await PgOwnerAssignmentModel.findOne({ pgId: parsed.data.pgId }).select('ownerId').lean()
    if (!assignment?.ownerId) {
      await UserModel.findByIdAndDelete(user.id)
      res.status(400).json({ message: 'Selected PG is not assigned to an owner yet' })
      return
    }

    user.role = 'tenant'
    user.set('tenantApprovalStatus', 'pending')
    user.set('tenantPgId', parsed.data.pgId)
    user.set('tenantOwnerId', assignment.ownerId)
    await user.save()

    await OtpModel.deleteMany({ email: parsed.data.email.toLowerCase(), purpose: 'registration' })
    res.status(201).json({
      id: user.id,
      status: 'pending_approval',
      message: `Tenant registration submitted for ${listing.name}. Awaiting owner/admin approval.`,
    })
    return
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: '1h' })
  await OtpModel.deleteMany({ email: parsed.data.email.toLowerCase(), purpose: 'registration' })
  res.status(201).json({
    id: user.id,
    token,
    user: { id: user.id, role: user.role, name: user.name },
  })
})

router.post('/send-registration-otp', async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const email = parsed.data.email.trim().toLowerCase()
  const existing = await UserModel.findOne({ email }).select('_id').lean()
  if (existing) {
    res.status(409).json({ message: 'Email already exists' })
    return
  }

  await createAndSendOtp(email, 'registration')
  res.json({ message: 'OTP sent' })
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
    res.status(401).json({ message: 'Invalid email or password' })
    return
  }

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!ok || user.status === 'blocked') {
    res.status(401).json({ message: 'Invalid email or password' })
    return
  }

  if (user.role === 'owner') {
    const ownerProfile = await OwnerProfileModel.findOne({ userId: user.id })
    if (!ownerProfile || ownerProfile.status !== 'approved') {
      res.status(403).json({ message: 'Owner account is pending admin approval.' })
      return
    }
  }

  if (user.role === 'tenant' && user.get('tenantApprovalStatus') !== 'approved') {
    res.status(403).json({ message: 'Tenant account is pending approval by owner/admin.' })
    return
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: '1h' })
  res.json({ token, user: { id: user.id, role: user.role, name: user.name } })
})

router.post('/forgot-password', async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const email = parsed.data.email.trim().toLowerCase()
  const user = await UserModel.findOne({ email }).select('_id').lean()
  if (user) {
    try {
      await createAndSendOtp(email, 'forgot-password')
    } catch (error) {
      if (!(error instanceof OtpDeliveryError)) {
        throw error
      }
      console.error('Unable to deliver password-reset OTP', error.message)
    }
  }
  res.json({ message: 'If that email is registered, an OTP has been sent.' })
})

router.post('/verify-reset-otp', async (req, res) => {
  const parsed = z.object({ email: z.string().email(), otp: z.string().trim().min(1) }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  const verification = await verifyOtp(parsed.data.email, 'forgot-password', parsed.data.otp)
  if (!verification.valid || !verification.otpId) {
    res.status(400).json({ error: verification.reason ?? 'Invalid OTP' })
    return
  }

  const resetToken = jwt.sign(
    {
      email: parsed.data.email.trim().toLowerCase(),
      purpose: 'password-reset',
      otpId: verification.otpId,
    },
    env.jwtSecret,
    { expiresIn: '15m' },
  )
  res.json({ resetToken })
})

router.post('/reset-password', async (req, res) => {
  const parsed = z
    .object({ resetToken: z.string().min(1), newPassword: z.string().min(8) })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }

  let payload: string | jwt.JwtPayload
  try {
    payload = jwt.verify(parsed.data.resetToken, env.jwtSecret)
  } catch {
    res.status(400).json({ message: 'Reset token is invalid or expired' })
    return
  }
  if (
    typeof payload === 'string' ||
    payload.purpose !== 'password-reset' ||
    typeof payload.email !== 'string' ||
    typeof payload.otpId !== 'string'
  ) {
    res.status(400).json({ message: 'Reset token is invalid or expired' })
    return
  }

  const otp = await OtpModel.findOneAndUpdate(
    {
      _id: payload.otpId,
      email: payload.email,
      purpose: 'forgot-password',
      expiresAt: { $gt: new Date() },
      verified: false,
    },
    { $set: { verified: true } },
    { returnDocument: 'after' },
  )
  if (!otp) {
    res.status(400).json({ message: 'Reset token is invalid or expired' })
    return
  }

  const user = await UserModel.findOne({ email: payload.email })
  if (!user) {
    res.status(404).json({ message: 'User not found' })
    return
  }

  user.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10)
  await user.save()
  await OtpModel.deleteMany({ email: payload.email, purpose: 'forgot-password' })
  res.json({ message: 'Password reset successfully. Please log in.' })
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
