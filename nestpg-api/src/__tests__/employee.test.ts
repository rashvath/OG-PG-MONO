import bcrypt from 'bcryptjs'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import app from '../app'
import {
  clearTestData,
  seedTestData,
  startTestDatabase,
  stopTestDatabase,
  TEST_PASSWORD,
  type TestContext,
} from './test-helpers'
import { ListingModel } from '../models/Listing'
import { OwnerProfileModel } from '../models/OwnerProfile'
import { PgOwnerAssignmentModel } from '../models/PgOwnerAssignment'
import { UserModel } from '../models/User'

describe('employee management API', () => {
  let context: TestContext

  beforeAll(async () => {
    await startTestDatabase()
    context = await seedTestData()
  })

  beforeEach(async () => {
    await clearTestData()
    context = await seedTestData()
  })

  afterAll(async () => {
    await stopTestDatabase()
  })

  it('manages roles, employees, attendance, expenses, leaves, and salary within owner scope', async () => {
    const ownerAuth = { Authorization: `Bearer ${context.ownerToken}` }
    const adminAuth = { Authorization: `Bearer ${context.adminToken}` }
    const role = await request(app)
      .post('/api/v1/owner/staff/roles')
      .set(ownerAuth)
      .send({ name: 'Chef', pgId: context.pgId, color: '#123abc' })
    expect(role.status).toBe(201)

    const duplicateRole = await request(app)
      .post('/api/v1/owner/staff/roles')
      .set(ownerAuth)
      .send({ name: 'Chef', pgId: context.pgId })
    expect(duplicateRole.status).toBe(409)

    const listedRoles = await request(app)
      .get(`/api/v1/owner/staff/roles?pgId=${context.pgId}`)
      .set(ownerAuth)
    expect(listedRoles.status).toBe(200)
    expect(listedRoles.body.items).toHaveLength(1)

    const employee = await request(app)
      .post('/api/v1/owner/staff')
      .set(ownerAuth)
      .send({
        name: 'Sam Chef',
        phone: '9000000020',
        email: 'sam@nestpg.test',
        pgId: context.pgId,
        roleId: role.body._id,
        monthlySalary: 30000,
        joiningDate: '2026-01-15',
        emergencyContact: { name: 'Contact', phone: '9000000021' },
      })
    expect(employee.status).toBe(201)
    expect(employee.body.roleId).toMatchObject({ name: 'Chef', color: '#123abc' })

    const employeeList = await request(app)
      .get(`/api/v1/owner/staff?pgId=${context.pgId}&status=active`)
      .set(ownerAuth)
    expect(employeeList.status).toBe(200)
    expect(employeeList.body.items).toHaveLength(1)

    const employeeDetail = await request(app)
      .get(`/api/v1/owner/staff/${employee.body._id}`)
      .set(ownerAuth)
    expect(employeeDetail.status).toBe(200)

    const employeeUpdate = await request(app)
      .patch(`/api/v1/owner/staff/${employee.body._id}`)
      .set(ownerAuth)
      .send({ monthlySalary: 32000 })
    expect(employeeUpdate.status).toBe(200)
    expect(employeeUpdate.body.monthlySalary).toBe(32000)

    const usedRoleDelete = await request(app)
      .delete(`/api/v1/owner/staff/roles/${role.body._id}`)
      .set(ownerAuth)
    expect(usedRoleDelete.status).toBe(409)

    const attendanceDate = '2026-02-10'
    const attendanceBody = {
      pgId: context.pgId,
      date: attendanceDate,
      records: [{
        employeeId: employee.body._id,
        status: 'present',
        checkIn: '09:30',
        checkOut: '18:00',
      }],
    }
    const savedAttendance = await request(app)
      .post('/api/v1/owner/staff/attendance/bulk')
      .set(ownerAuth)
      .send(attendanceBody)
    expect(savedAttendance.status).toBe(200)
    expect(savedAttendance.body.savedCount).toBe(1)

    const resavedAttendance = await request(app)
      .post('/api/v1/owner/staff/attendance/bulk')
      .set(ownerAuth)
      .send({ ...attendanceBody, records: [{ ...attendanceBody.records[0], status: 'half-day' }] })
    expect(resavedAttendance.status).toBe(200)
    expect(resavedAttendance.body.items).toHaveLength(1)

    const dailyAttendance = await request(app)
      .get(`/api/v1/owner/staff/attendance?pgId=${context.pgId}&date=${attendanceDate}`)
      .set(ownerAuth)
    expect(dailyAttendance.status).toBe(200)
    expect(dailyAttendance.body.items).toHaveLength(1)
    const attendanceId = dailyAttendance.body.items[0]._id as string

    const correctedAttendance = await request(app)
      .patch(`/api/v1/owner/staff/attendance/${attendanceId}`)
      .set(ownerAuth)
      .send({ status: 'present', notes: 'Corrected' })
    expect(correctedAttendance.status).toBe(200)

    const monthlyAttendance = await request(app)
      .get(`/api/v1/owner/staff/attendance?pgId=${context.pgId}&month=2&year=2026`)
      .set(ownerAuth)
    expect(monthlyAttendance.status).toBe(200)
    expect(monthlyAttendance.body.items).toHaveLength(1)

    const attendanceSummary = await request(app)
      .get(`/api/v1/owner/staff/${employee.body._id}/attendance-summary?month=2&year=2026`)
      .set(ownerAuth)
    expect(attendanceSummary.status).toBe(200)
    expect(attendanceSummary.body).toEqual({ present: 1, absent: 0, halfDay: 0, onLeave: 0, totalDays: 1 })

    const expense = await request(app)
      .post('/api/v1/owner/staff/expenses')
      .set(ownerAuth)
      .send({
        pgId: context.pgId,
        employeeId: employee.body._id,
        amount: 450,
        description: 'Kitchen supplies',
        category: 'supplies',
        expenseDate: '2026-02-11',
      })
    expect(expense.status).toBe(201)

    const expenses = await request(app)
      .get(`/api/v1/owner/staff/expenses?pgId=${context.pgId}&month=2&year=2026`)
      .set(ownerAuth)
    expect(expenses.status).toBe(200)
    expect(expenses.body.totalAmount).toBe(450)

    const expenseUpdate = await request(app)
      .patch(`/api/v1/owner/staff/expenses/${expense.body._id}`)
      .set(ownerAuth)
      .send({ amount: 500 })
    expect(expenseUpdate.status).toBe(200)

    const leave = await request(app)
      .post('/api/v1/owner/staff/leaves')
      .set(ownerAuth)
      .send({
        pgId: context.pgId,
        employeeId: employee.body._id,
        startDate: '2026-02-15',
        endDate: '2026-02-16',
        leaveType: 'casual',
        reason: 'Personal',
      })
    expect(leave.status).toBe(201)
    expect(leave.body.totalDays).toBe(2)

    const approvedLeave = await request(app)
      .patch(`/api/v1/owner/staff/leaves/${leave.body._id}/approve`)
      .set(ownerAuth)
      .send({})
    expect(approvedLeave.status).toBe(200)
    expect(approvedLeave.body.status).toBe('approved')

    const salary = await request(app)
      .post('/api/v1/owner/staff/salary')
      .set(ownerAuth)
      .send({
        pgId: context.pgId,
        employeeId: employee.body._id,
        month: 2,
        year: 2026,
        deductions: 1000,
        bonuses: 500,
        paidAt: '2026-02-28',
        paymentMode: 'upi',
      })
    expect(salary.status).toBe(201)
    expect(salary.body).toMatchObject({ baseSalary: 32000, netPaid: 31500 })

    const duplicateSalary = await request(app)
      .post('/api/v1/owner/staff/salary')
      .set(ownerAuth)
      .send({
        pgId: context.pgId,
        employeeId: employee.body._id,
        month: 2,
        year: 2026,
        paidAt: '2026-02-28',
      })
    expect(duplicateSalary.status).toBe(409)

    const salaryList = await request(app)
      .get(`/api/v1/owner/staff/salary?pgId=${context.pgId}&month=2&year=2026`)
      .set(ownerAuth)
    expect(salaryList.status).toBe(200)
    expect(salaryList.body.items).toHaveLength(1)

    const salaryHistory = await request(app)
      .get(`/api/v1/owner/staff/${employee.body._id}/salary-history`)
      .set(ownerAuth)
    expect(salaryHistory.status).toBe(200)
    expect(salaryHistory.body.items).toHaveLength(1)

    const adminStaff = await request(app).get('/api/v1/admin/staff').set(adminAuth)
    expect(adminStaff.status).toBe(200)
    expect(adminStaff.body.items).toHaveLength(1)
    const adminExpenses = await request(app)
      .get('/api/v1/admin/staff/expenses?month=2&year=2026')
      .set(adminAuth)
    expect(adminExpenses.status).toBe(200)
    expect(adminExpenses.body.totalAmount).toBe(500)
    const unauthenticatedAdminStaff = await request(app).get('/api/v1/admin/staff')
    expect(unauthenticatedAdminStaff.status).toBe(401)
    const ownerAdminStaff = await request(app).get('/api/v1/admin/staff').set(ownerAuth)
    expect(ownerAdminStaff.status).toBe(403)

    const deletedSalary = await request(app)
      .delete(`/api/v1/owner/staff/salary/${salary.body._id}`)
      .set(ownerAuth)
    expect(deletedSalary.status).toBe(200)

    const deletedExpense = await request(app)
      .delete(`/api/v1/owner/staff/expenses/${expense.body._id}`)
      .set(ownerAuth)
    expect(deletedExpense.status).toBe(200)

    const softDeletedEmployee = await request(app)
      .delete(`/api/v1/owner/staff/${employee.body._id}`)
      .set(ownerAuth)
    expect(softDeletedEmployee.status).toBe(200)
    expect(softDeletedEmployee.body.item.status).toBe('resigned')

    const deletedRole = await request(app)
      .delete(`/api/v1/owner/staff/roles/${role.body._id}`)
      .set(ownerAuth)
    expect(deletedRole.status).toBe(409)
  })

  it('does not expose another owner’s employees or accept their PG scope', async () => {
    const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4)
    const otherOwner = await UserModel.create({
      name: 'Other Owner',
      email: 'other-owner@nestpg.test',
      phone: '9000000040',
      passwordHash,
      role: 'owner',
    })
    await OwnerProfileModel.create({ userId: otherOwner._id, status: 'approved' })
    const otherListing = await ListingModel.create({
      name: 'Other PG',
      area: 'Indiranagar',
      baseRent: 12000,
      gender: 'Women',
      status: 'live',
    })
    await PgOwnerAssignmentModel.create({
      pgId: otherListing._id,
      ownerId: otherOwner._id,
      assignedBy: context.adminId,
    })
    const login = await request(app).post('/api/v1/auth/login').send({
      email: otherOwner.email,
      password: TEST_PASSWORD,
    })
    expect(login.status).toBe(200)

    const role = await request(app)
      .post('/api/v1/owner/staff/roles')
      .set({ Authorization: `Bearer ${login.body.token}` })
      .send({ name: 'Guard', pgId: String(otherListing._id) })
    expect(role.status).toBe(201)
    const employee = await request(app)
      .post('/api/v1/owner/staff')
      .set({ Authorization: `Bearer ${login.body.token}` })
      .send({
        name: 'Other Employee',
        phone: '9000000041',
        pgId: String(otherListing._id),
        roleId: role.body._id,
        monthlySalary: 20000,
        joiningDate: '2026-01-01',
      })
    expect(employee.status).toBe(201)

    const ownerAuth = { Authorization: `Bearer ${context.ownerToken}` }
    const crossOwnerList = await request(app)
      .get(`/api/v1/owner/staff?pgId=${String(otherListing._id)}`)
      .set(ownerAuth)
    expect(crossOwnerList.status).toBe(403)

    const crossOwnerDetail = await request(app)
      .get(`/api/v1/owner/staff/${employee.body._id}`)
      .set(ownerAuth)
    expect(crossOwnerDetail.status).toBe(404)
  })
})
