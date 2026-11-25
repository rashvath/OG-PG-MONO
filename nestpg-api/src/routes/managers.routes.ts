import bcrypt from 'bcryptjs'
import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'

import { auth, type AuthedRequest } from '../middleware/auth'
import { ManagerAccessModel, MANAGER_MODULES } from '../models/ManagerAccess'
import { PgOwnerAssignmentModel } from '../models/PgOwnerAssignment'
import { UserModel } from '../models/User'

const router = Router()
const actions = ['read', 'create', 'update', 'delete'] as const
const permissionSchema = z.object(Object.fromEntries(MANAGER_MODULES.map((module) => [
  module, z.object(Object.fromEntries(actions.map((action) => [action, z.boolean()]))),
])))
const inputSchema = z.object({
  name: z.string().trim().min(2).max(120), email: z.string().email().transform((s) => s.toLowerCase()),
  phone: z.string().regex(/^\d{10}$/), pgId: z.string().regex(/^[a-f\d]{24}$/i),
  permissions: permissionSchema,
})

router.get('/managers', auth('owner'), async (req: AuthedRequest, res) => {
  const ownerId = req.user?.sub
  const items = await ManagerAccessModel.find({ ownerId } as never).populate('managerId', 'name email phone status').populate('pgId', 'name area').sort({ createdAt: -1 }).lean()
  res.json({ items })
})

router.post('/managers', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = inputSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ message: parsed.error.flatten() }); return }
  const ownerId = req.user?.sub
  if (!ownerId) { res.status(401).json({ message: 'Unauthorized' }); return }
  const assignment = await PgOwnerAssignmentModel.exists({ ownerId, pgId: parsed.data.pgId })
  if (!assignment) { res.status(403).json({ message: 'You can only assign managers to your PGs' }); return }
  if (await UserModel.exists({ email: parsed.data.email })) { res.status(409).json({ message: 'Email already exists' }); return }

  const temporaryPassword = randomBytes(9).toString('base64url') + 'A1!'
  const user = await UserModel.create({ name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone, passwordHash: await bcrypt.hash(temporaryPassword, 10), role: 'manager' })
  try {
    const access = await ManagerAccessModel.create({ managerId: user._id, ownerId, pgId: parsed.data.pgId, permissions: parsed.data.permissions, createdBy: ownerId })
    res.status(201).json({ item: { id: user.id, name: user.name, email: user.email, phone: user.phone, pgId: String(access.pgId), permissions: parsed.data.permissions }, temporaryPassword })
  } catch (error) {
    await UserModel.findByIdAndDelete(user._id)
    throw error
  }
})

router.patch('/managers/:id', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({ permissions: permissionSchema, status: z.enum(['active', 'blocked']).optional() }).safeParse(req.body)
  if (!parsed.success || !mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ message: parsed.success ? 'Invalid manager id' : parsed.error.flatten() }); return }
  const access = await ManagerAccessModel.findOneAndUpdate({ managerId: req.params.id, ownerId: req.user?.sub } as never, { $set: { permissions: parsed.data.permissions } }, { new: true }).lean()
  if (!access) { res.status(404).json({ message: 'Manager not found' }); return }
  if (parsed.data.status) await UserModel.findByIdAndUpdate(req.params.id, { status: parsed.data.status })
  res.json({ item: access })
})

router.delete('/managers/:id', auth('owner'), async (req: AuthedRequest, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400).json({ message: 'Invalid manager id' }); return }
  const access = await ManagerAccessModel.findOneAndDelete({ managerId: req.params.id, ownerId: req.user?.sub } as never)
  if (!access) { res.status(404).json({ message: 'Manager not found' }); return }
  await UserModel.findByIdAndDelete(req.params.id)
  res.json({ message: 'Manager access revoked' })
})

router.get('/manager/access', auth('manager'), async (req: AuthedRequest, res) => {
  const access = await ManagerAccessModel.findOne({ managerId: req.user?.sub } as never).populate('pgId', 'name area').lean()
  if (!access) { res.status(403).json({ message: 'Manager access has been revoked' }); return }
  res.json({ item: access })
})

export default router
