import { Router, type Response } from 'express'
import mongoose from 'mongoose'
import { z } from 'zod'

import { auth, type AuthedRequest } from '../middleware/auth'
import { AttendanceModel } from '../models/Attendance'
import { CustomRoleModel } from '../models/CustomRole'
import { EmployeeExpenseModel } from '../models/EmployeeExpense'
import { EmployeeLeaveModel } from '../models/EmployeeLeave'
import { EmployeeModel } from '../models/Employee'
import { OwnerProfileModel } from '../models/OwnerProfile'
import { PgOwnerAssignmentModel } from '../models/PgOwnerAssignment'
import { SalaryPaymentModel } from '../models/SalaryPayment'

const router = Router()
const PHONE_REGEX = /^\d{10}$/
const COLOR_REGEX = /^#[\da-f]{6}$/i
const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id')
const attendanceStatusSchema = z.enum(['present', 'absent', 'half-day', 'on-leave'])
const employeeStatusSchema = z.enum(['active', 'inactive', 'resigned'])
const leaveStatusSchema = z.enum(['pending', 'approved', 'rejected'])
const leaveTypeSchema = z.enum(['sick', 'casual', 'annual', 'unpaid', 'emergency'])
const expenseCategorySchema = z.enum(['food', 'supplies', 'maintenance', 'travel', 'utilities', 'other'])

function dayStart(value: Date) {
  const date = new Date(value)
  date.setUTCHours(0, 0, 0, 0)
  return date
}

function dayEnd(value: Date) {
  const date = new Date(value)
  date.setUTCHours(23, 59, 59, 999)
  return date
}

function monthRange(month: number, year: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  }
}

function objectId(id: string | string[] | undefined) {
  const value = Array.isArray(id) ? id[0] : id
  return new mongoose.Types.ObjectId(value ?? '')
}

function isDuplicateKey(error: unknown) {
  return error instanceof mongoose.mongo.MongoServerError && error.code === 11000
}

async function ensureApprovedOwner(ownerId: string) {
  const profile = await OwnerProfileModel.findOne({ userId: objectId(ownerId) }).select('status').lean()
  return profile?.status === 'approved'
}

async function ensureAssignedPg(ownerId: string, pgId: string) {
  if (!mongoose.isValidObjectId(pgId)) {
    return false
  }
  const assignment = await PgOwnerAssignmentModel.exists({
    ownerId: objectId(ownerId),
    pgId: objectId(pgId),
  } as Record<string, unknown>)
  return Boolean(assignment)
}

async function getOwnerAndAssignedPg(req: AuthedRequest, res: Response, pgId: string) {
  const ownerId = req.user?.sub
  if (!ownerId) {
    res.status(401).json({ message: 'Unauthorized' })
    return null
  }
  if (!(await ensureApprovedOwner(ownerId))) {
    res.status(403).json({ message: 'Owner account is not approved' })
    return null
  }
  if (!(await ensureAssignedPg(ownerId, pgId))) {
    res.status(403).json({ message: 'Forbidden: PG is not assigned to this owner' })
    return null
  }
  return { ownerId, pgId }
}

async function findEmployee(ownerId: string, pgId: string, employeeId: string) {
  if (!mongoose.isValidObjectId(employeeId)) {
    return null
  }
  return EmployeeModel.findOne({
    _id: objectId(employeeId),
    ownerId: objectId(ownerId),
    pgId: objectId(pgId),
  } as Record<string, unknown>)
}

const roleInputSchema = z.object({
  name: z.string().trim().min(2).max(60),
  pgId: objectIdSchema,
  color: z.string().regex(COLOR_REGEX).default('#6366f1'),
})

const employeeCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(PHONE_REGEX, 'Phone must be exactly 10 digits'),
  email: z.union([z.string().trim().email().max(254), z.literal('')]).optional(),
  pgId: objectIdSchema,
  roleId: objectIdSchema,
  monthlySalary: z.number().nonnegative(),
  joiningDate: z.coerce.date(),
  address: z.string().trim().max(500).optional(),
  emergencyContact: z.object({
    name: z.string().trim().max(120).optional(),
    phone: z.union([z.string().regex(PHONE_REGEX), z.literal('')]).optional(),
  }).optional(),
  profilePhoto: z.string().url().optional(),
  notes: z.string().trim().max(1000).optional(),
})

const employeeUpdateSchema = employeeCreateSchema.omit({ pgId: true }).partial().extend({
  status: employeeStatusSchema.optional(),
})

const attendanceRecordSchema = z.object({
  employeeId: objectIdSchema,
  status: attendanceStatusSchema,
  checkIn: z.string().regex(TIME_REGEX).optional(),
  checkOut: z.string().regex(TIME_REGEX).optional(),
  notes: z.string().trim().max(500).optional(),
})

const expenseInputSchema = z.object({
  pgId: objectIdSchema,
  employeeId: objectIdSchema,
  amount: z.number().positive(),
  description: z.string().trim().min(2).max(240),
  category: expenseCategorySchema.default('other'),
  expenseDate: z.coerce.date(),
  receiptUrl: z.string().url().optional(),
  notes: z.string().trim().max(1000).optional(),
})

const leaveInputSchema = z.object({
  pgId: objectIdSchema,
  employeeId: objectIdSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  leaveType: leaveTypeSchema,
  reason: z.string().trim().max(1000).optional(),
})

const salaryInputSchema = z.object({
  pgId: objectIdSchema,
  employeeId: objectIdSchema,
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2200),
  baseSalary: z.number().nonnegative().optional(),
  deductions: z.number().nonnegative().default(0),
  bonuses: z.number().nonnegative().default(0),
  paidAt: z.coerce.date(),
  paymentMode: z.enum(['cash', 'upi', 'bank']).default('cash'),
  notes: z.string().trim().max(1000).optional(),
})

router.get('/staff/roles', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({ pgId: objectIdSchema }).safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return

  const items = await CustomRoleModel.find({ ownerId: scope.ownerId, pgId: scope.pgId }).sort({ name: 1 }).lean()
  res.json({ items })
})

router.post('/staff/roles', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = roleInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return

  try {
    const item = await CustomRoleModel.create({
      name: parsed.data.name,
      pgId: objectId(scope.pgId),
      ownerId: objectId(scope.ownerId),
      color: parsed.data.color,
      createdBy: objectId(scope.ownerId),
    })
    res.status(201).json(item)
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    res.status(409).json({ message: 'A role with this name already exists for this PG' })
  }
})

router.patch('/staff/roles/:id', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    name: z.string().trim().min(2).max(60).optional(),
    color: z.string().regex(COLOR_REGEX).optional(),
  }).refine((value) => Object.keys(value).length > 0, 'At least one field is required').safeParse(req.body)
  if (!parsed.success || !mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: parsed.success ? 'Invalid role id' : parsed.error.flatten() })
    return
  }

  const role = await CustomRoleModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
  } as Record<string, unknown>)
  if (!role) {
    res.status(404).json({ message: 'Role not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(role.pgId))
  if (!scope) return
  if (parsed.data.name !== undefined) role.name = parsed.data.name
  if (parsed.data.color !== undefined) role.color = parsed.data.color
  try {
    await role.save()
    res.json(role)
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    res.status(409).json({ message: 'A role with this name already exists for this PG' })
  }
})

router.delete('/staff/roles/:id', auth('owner'), async (req: AuthedRequest, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid role id' })
    return
  }
  const role = await CustomRoleModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
  } as Record<string, unknown>)
  if (!role) {
    res.status(404).json({ message: 'Role not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(role.pgId))
  if (!scope) return
  if (await EmployeeModel.exists({
    ownerId: objectId(scope.ownerId),
    pgId: objectId(scope.pgId),
    roleId: role._id,
  } as Record<string, unknown>)) {
    res.status(409).json({ message: 'Cannot delete a role used by employees' })
    return
  }
  await role.deleteOne()
  res.json({ message: 'Role deleted' })
})

router.get('/staff', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    pgId: objectIdSchema,
    status: employeeStatusSchema.optional(),
  }).safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return

  const filter: Record<string, unknown> = { ownerId: scope.ownerId, pgId: scope.pgId }
  if (parsed.data.status) filter.status = parsed.data.status
  const items = await EmployeeModel.find(filter).populate('roleId', 'name color').sort({ name: 1 }).lean()
  res.json({ items })
})

router.post('/staff', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = employeeCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return
  const role = await CustomRoleModel.exists({
    _id: objectId(parsed.data.roleId),
    ownerId: objectId(scope.ownerId),
    pgId: objectId(scope.pgId),
  } as Record<string, unknown>)
  if (!role) {
    res.status(400).json({ message: 'Role must belong to this PG and owner' })
    return
  }
  const item = await EmployeeModel.create({
    name: parsed.data.name,
    phone: parsed.data.phone,
    ...(parsed.data.email ? { email: parsed.data.email } : {}),
    pgId: objectId(scope.pgId),
    ownerId: objectId(scope.ownerId),
    roleId: objectId(parsed.data.roleId),
    monthlySalary: parsed.data.monthlySalary,
    joiningDate: parsed.data.joiningDate,
    ...(parsed.data.address ? { address: parsed.data.address } : {}),
    ...(parsed.data.emergencyContact
      ? {
          emergencyContact: {
            name: parsed.data.emergencyContact.name ?? '',
            phone: parsed.data.emergencyContact.phone ?? '',
          },
        }
      : {}),
    ...(parsed.data.profilePhoto ? { profilePhoto: parsed.data.profilePhoto } : {}),
    ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
  })
  await item.populate('roleId', 'name color')
  res.status(201).json(item)
})

router.get('/staff/attendance', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    pgId: objectIdSchema,
    date: z.coerce.date().optional(),
    employeeId: objectIdSchema.optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2200).optional(),
  }).refine((value) => Boolean(value.date) || Boolean(value.month && value.year), {
    message: 'Provide date or both month and year',
  }).safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return

  const filter: Record<string, unknown> = { ownerId: scope.ownerId, pgId: scope.pgId }
  if (parsed.data.employeeId) {
    if (!(await findEmployee(scope.ownerId, scope.pgId, parsed.data.employeeId))) {
      res.status(404).json({ message: 'Employee not found' })
      return
    }
    filter.employeeId = parsed.data.employeeId
  }
  if (parsed.data.date) {
    filter.date = dayStart(parsed.data.date)
  } else if (parsed.data.month && parsed.data.year) {
    const range = monthRange(parsed.data.month, parsed.data.year)
    filter.date = { $gte: range.start, $lt: range.end }
  }

  const items = await AttendanceModel.find(filter)
    .populate('employeeId', 'name phone roleId')
    .sort({ date: 1 })
    .lean()
  res.json({ items })
})

router.post('/staff/attendance/bulk', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    pgId: objectIdSchema,
    date: z.coerce.date(),
    records: z.array(attendanceRecordSchema).min(1).max(500),
  }).safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return

  const ids = parsed.data.records.map((record) => record.employeeId)
  if (new Set(ids).size !== ids.length) {
    res.status(400).json({ message: 'Each employee may appear only once per attendance submission' })
    return
  }
  const employees = await EmployeeModel.find({
    _id: { $in: ids },
    ownerId: scope.ownerId,
    pgId: scope.pgId,
    status: 'active',
  }).select('_id').lean()
  if (employees.length !== ids.length) {
    res.status(400).json({ message: 'All employees must be active and belong to this PG' })
    return
  }

  const date = dayStart(parsed.data.date)
  await AttendanceModel.bulkWrite(parsed.data.records.map((record) => ({
    updateOne: {
      filter: { employeeId: record.employeeId, date },
      update: {
        $set: {
          ...record,
          employeeId: record.employeeId,
          ownerId: scope.ownerId,
          pgId: scope.pgId,
          date,
        },
      },
      upsert: true,
    },
  })))
  const items = await AttendanceModel.find({ ownerId: scope.ownerId, pgId: scope.pgId, date })
    .populate('employeeId', 'name phone roleId')
    .sort({ createdAt: 1 })
    .lean()
  res.json({ savedCount: parsed.data.records.length, items })
})

router.patch('/staff/attendance/:id', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    status: attendanceStatusSchema.optional(),
    checkIn: z.string().regex(TIME_REGEX).nullable().optional(),
    checkOut: z.string().regex(TIME_REGEX).nullable().optional(),
    notes: z.string().trim().max(500).optional(),
  }).refine((value) => Object.keys(value).length > 0, 'At least one field is required').safeParse(req.body)
  if (!parsed.success || !mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: parsed.success ? 'Invalid attendance id' : parsed.error.flatten() })
    return
  }
  const record = await AttendanceModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
  } as Record<string, unknown>)
  if (!record) {
    res.status(404).json({ message: 'Attendance record not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(record.pgId))
  if (!scope) return
  Object.assign(record, parsed.data)
  await record.save()
  res.json(record)
})

router.get('/staff/:id/attendance-summary', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(2200),
  }).safeParse(req.query)
  if (!parsed.success || !mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: parsed.success ? 'Invalid employee id' : parsed.error.flatten() })
    return
  }
  const employee = await EmployeeModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
  } as Record<string, unknown>)
  if (!employee) {
    res.status(404).json({ message: 'Employee not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(employee.pgId))
  if (!scope) return
  const range = monthRange(parsed.data.month, parsed.data.year)
  const records = await AttendanceModel.find({
    employeeId: employee._id,
    ownerId: scope.ownerId,
    pgId: scope.pgId,
    date: { $gte: range.start, $lt: range.end },
  }).select('status').lean()
  const counts = { present: 0, absent: 0, halfDay: 0, onLeave: 0 }
  for (const record of records) {
    if (record.status === 'present') counts.present += 1
    else if (record.status === 'absent') counts.absent += 1
    else if (record.status === 'half-day') counts.halfDay += 1
    else counts.onLeave += 1
  }
  res.json({ ...counts, totalDays: records.length })
})

router.get('/staff/expenses', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    pgId: objectIdSchema,
    employeeId: objectIdSchema.optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2200).optional(),
  }).refine((value) => Boolean(value.month) === Boolean(value.year), {
    message: 'Month and year must be provided together',
  }).safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return

  const filter: Record<string, unknown> = { ownerId: scope.ownerId, pgId: scope.pgId }
  if (parsed.data.employeeId) {
    if (!(await findEmployee(scope.ownerId, scope.pgId, parsed.data.employeeId))) {
      res.status(404).json({ message: 'Employee not found' })
      return
    }
    filter.employeeId = parsed.data.employeeId
  }
  if (parsed.data.month && parsed.data.year) {
    const range = monthRange(parsed.data.month, parsed.data.year)
    filter.expenseDate = { $gte: range.start, $lt: range.end }
  }
  const items = await EmployeeExpenseModel.find(filter)
    .populate('employeeId', 'name phone')
    .sort({ expenseDate: -1 })
    .lean()
  res.json({ items, totalAmount: items.reduce((total, item) => total + item.amount, 0) })
})

router.post('/staff/expenses', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = expenseInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return
  if (!(await findEmployee(scope.ownerId, scope.pgId, parsed.data.employeeId))) {
    res.status(404).json({ message: 'Employee not found' })
    return
  }
  const item = await EmployeeExpenseModel.create({
    employeeId: objectId(parsed.data.employeeId),
    pgId: objectId(scope.pgId),
    ownerId: objectId(scope.ownerId),
    amount: parsed.data.amount,
    description: parsed.data.description,
    category: parsed.data.category,
    expenseDate: parsed.data.expenseDate,
    ...(parsed.data.receiptUrl ? { receiptUrl: parsed.data.receiptUrl } : {}),
    paidBy: objectId(scope.ownerId),
    ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
  })
  await item.populate('employeeId', 'name phone')
  res.status(201).json(item)
})

router.patch('/staff/expenses/:id', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = expenseInputSchema.omit({ pgId: true }).partial().safeParse(req.body)
  if (!parsed.success || !mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: parsed.success ? 'Invalid expense id' : parsed.error.flatten() })
    return
  }
  const item = await EmployeeExpenseModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
  } as Record<string, unknown>)
  if (!item) {
    res.status(404).json({ message: 'Expense not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(item.pgId))
  if (!scope) return
  if (parsed.data.employeeId && !(await findEmployee(scope.ownerId, scope.pgId, parsed.data.employeeId))) {
    res.status(404).json({ message: 'Employee not found' })
    return
  }
  Object.assign(item, parsed.data)
  await item.save()
  await item.populate('employeeId', 'name phone')
  res.json(item)
})

router.delete('/staff/expenses/:id', auth('owner'), async (req: AuthedRequest, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid expense id' })
    return
  }
  const item = await EmployeeExpenseModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
  } as Record<string, unknown>)
  if (!item) {
    res.status(404).json({ message: 'Expense not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(item.pgId))
  if (!scope) return
  await item.deleteOne()
  res.json({ message: 'Expense deleted' })
})

router.get('/staff/leaves', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    pgId: objectIdSchema,
    employeeId: objectIdSchema.optional(),
    status: leaveStatusSchema.optional(),
  }).safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return
  const filter: Record<string, unknown> = { ownerId: scope.ownerId, pgId: scope.pgId }
  if (parsed.data.employeeId) filter.employeeId = parsed.data.employeeId
  if (parsed.data.status) filter.status = parsed.data.status
  const items = await EmployeeLeaveModel.find(filter)
    .populate('employeeId', 'name phone')
    .sort({ startDate: -1 })
    .lean()
  res.json({ items })
})

router.post('/staff/leaves', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = leaveInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return
  if (!(await findEmployee(scope.ownerId, scope.pgId, parsed.data.employeeId))) {
    res.status(404).json({ message: 'Employee not found' })
    return
  }
  const startDate = dayStart(parsed.data.startDate)
  const endDate = dayStart(parsed.data.endDate)
  if (endDate < startDate) {
    res.status(400).json({ message: 'End date must be on or after start date' })
    return
  }
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1
  const item = await EmployeeLeaveModel.create({
    employeeId: objectId(parsed.data.employeeId),
    pgId: objectId(scope.pgId),
    ownerId: objectId(scope.ownerId),
    startDate,
    endDate,
    totalDays,
    leaveType: parsed.data.leaveType,
    ...(parsed.data.reason ? { reason: parsed.data.reason } : {}),
  })
  await item.populate('employeeId', 'name phone')
  res.status(201).json(item)
})

router.patch('/staff/leaves/:id/approve', auth('owner'), async (req: AuthedRequest, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid leave id' })
    return
  }
  const item = await EmployeeLeaveModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
    status: 'pending',
  } as Record<string, unknown>)
  if (!item) {
    res.status(404).json({ message: 'Pending leave not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(item.pgId))
  if (!scope) return
  item.status = 'approved'
  item.approvedBy = new mongoose.Types.ObjectId(scope.ownerId)
  item.approvedAt = new Date()
  await item.save()
  res.json(item)
})

router.patch('/staff/leaves/:id/reject', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({ rejectedNote: z.string().trim().max(500).default('') }).safeParse(req.body)
  if (!parsed.success || !mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: parsed.success ? 'Invalid leave id' : parsed.error.flatten() })
    return
  }
  const item = await EmployeeLeaveModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
    status: 'pending',
  } as Record<string, unknown>)
  if (!item) {
    res.status(404).json({ message: 'Pending leave not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(item.pgId))
  if (!scope) return
  item.status = 'rejected'
  item.rejectedNote = parsed.data.rejectedNote
  await item.save()
  res.json(item)
})

router.delete('/staff/leaves/:id', auth('owner'), async (req: AuthedRequest, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid leave id' })
    return
  }
  const item = await EmployeeLeaveModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
    status: 'pending',
  } as Record<string, unknown>)
  if (!item) {
    res.status(404).json({ message: 'Pending leave not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(item.pgId))
  if (!scope) return
  await item.deleteOne()
  res.json({ message: 'Leave deleted' })
})

router.get('/staff/salary', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    pgId: objectIdSchema,
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(2200),
  }).safeParse(req.query)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return
  const items = await SalaryPaymentModel.find({
    ownerId: scope.ownerId,
    pgId: scope.pgId,
    month: parsed.data.month,
    year: parsed.data.year,
  }).populate({ path: 'employeeId', select: 'name phone roleId', populate: { path: 'roleId', select: 'name color' } })
    .sort({ createdAt: -1 })
    .lean()
  res.json({ items })
})

router.post('/staff/salary', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = salaryInputSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.flatten() })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, parsed.data.pgId)
  if (!scope) return
  const employee = await findEmployee(scope.ownerId, scope.pgId, parsed.data.employeeId)
  if (!employee) {
    res.status(404).json({ message: 'Employee not found' })
    return
  }
  const baseSalary = parsed.data.baseSalary ?? employee.monthlySalary
  const netPaid = baseSalary - parsed.data.deductions + parsed.data.bonuses
  if (netPaid < 0) {
    res.status(400).json({ message: 'Deductions cannot exceed base salary plus bonuses' })
    return
  }
  try {
    const item = await SalaryPaymentModel.create({
      employeeId: objectId(parsed.data.employeeId),
      pgId: objectId(scope.pgId),
      ownerId: objectId(scope.ownerId),
      month: parsed.data.month,
      year: parsed.data.year,
      baseSalary,
      deductions: parsed.data.deductions,
      bonuses: parsed.data.bonuses,
      netPaid,
      paidAt: parsed.data.paidAt,
      paymentMode: parsed.data.paymentMode,
      ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
    })
    await item.populate({ path: 'employeeId', select: 'name phone roleId', populate: { path: 'roleId', select: 'name color' } })
    res.status(201).json(item)
  } catch (error) {
    if (!isDuplicateKey(error)) throw error
    res.status(409).json({ message: 'Salary has already been recorded for this employee and month' })
  }
})

router.get('/staff/:id/salary-history', auth('owner'), async (req: AuthedRequest, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid employee id' })
    return
  }
  const employee = await EmployeeModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
  } as Record<string, unknown>)
  if (!employee) {
    res.status(404).json({ message: 'Employee not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(employee.pgId))
  if (!scope) return
  const items = await SalaryPaymentModel.find({
    ownerId: scope.ownerId,
    pgId: scope.pgId,
    employeeId: employee._id,
  }).sort({ year: -1, month: -1 }).lean()
  res.json({ items })
})

router.delete('/staff/salary/:id', auth('owner'), async (req: AuthedRequest, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid salary payment id' })
    return
  }
  const item = await SalaryPaymentModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
  } as Record<string, unknown>)
  if (!item) {
    res.status(404).json({ message: 'Salary payment not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(item.pgId))
  if (!scope) return
  await item.deleteOne()
  res.json({ message: 'Salary payment deleted' })
})

router.get('/staff/:id', auth('owner'), async (req: AuthedRequest, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid employee id' })
    return
  }
  const employee = await EmployeeModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
  } as Record<string, unknown>)
    .populate('roleId', 'name color')
  if (!employee) {
    res.status(404).json({ message: 'Employee not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(employee.pgId))
  if (!scope) return
  res.json(employee)
})

router.patch('/staff/:id', auth('owner'), async (req: AuthedRequest, res) => {
  const parsed = employeeUpdateSchema.safeParse(req.body)
  if (!parsed.success || !mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: parsed.success ? 'Invalid employee id' : parsed.error.flatten() })
    return
  }
  const employee = await EmployeeModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
  } as Record<string, unknown>)
  if (!employee) {
    res.status(404).json({ message: 'Employee not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(employee.pgId))
  if (!scope) return
  if (parsed.data.roleId && !(await CustomRoleModel.exists({
    _id: objectId(parsed.data.roleId),
    ownerId: objectId(scope.ownerId),
    pgId: objectId(scope.pgId),
  } as Record<string, unknown>))) {
    res.status(400).json({ message: 'Role must belong to this PG and owner' })
    return
  }
  if (parsed.data.email === '') {
    employee.set('email', undefined)
    delete parsed.data.email
  }
  Object.assign(employee, parsed.data)
  await employee.save()
  await employee.populate('roleId', 'name color')
  res.json(employee)
})

router.delete('/staff/:id', auth('owner'), async (req: AuthedRequest, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid employee id' })
    return
  }
  const employee = await EmployeeModel.findOne({
    _id: objectId(req.params.id),
    ownerId: objectId(req.user?.sub ?? ''),
  } as Record<string, unknown>)
  if (!employee) {
    res.status(404).json({ message: 'Employee not found' })
    return
  }
  const scope = await getOwnerAndAssignedPg(req, res, String(employee.pgId))
  if (!scope) return
  employee.status = 'resigned'
  await employee.save()
  res.json({ message: 'Employee marked as resigned', item: employee })
})

export default router
