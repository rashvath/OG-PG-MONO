import { apiDelete, apiGet, apiPatch, apiPost } from './api'

export type StaffRole = {
  _id: string
  name: string
  pgId: string
  color: string
}

export type StaffEmployee = {
  _id: string
  name: string
  phone: string
  email?: string
  pgId: string
  roleId: StaffRole | string
  monthlySalary: number
  joiningDate: string
  status: 'active' | 'inactive' | 'resigned'
  address?: string
  notes?: string
}

export type StaffAttendance = {
  _id: string
  employeeId: { _id: string; name: string } | string
  date: string
  status: 'present' | 'absent' | 'half-day' | 'on-leave'
  checkIn?: string
  checkOut?: string
  notes?: string
}

export type StaffExpense = {
  _id: string
  employeeId: { _id: string; name: string } | string
  amount: number
  description: string
  category: string
  expenseDate: string
  notes?: string
}

export type StaffLeave = {
  _id: string
  employeeId: { _id: string; name: string } | string
  startDate: string
  endDate: string
  totalDays: number
  leaveType: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
}

export type StaffSalary = {
  _id: string
  employeeId: { _id: string; name: string } | string
  month: number
  year: number
  baseSalary: number
  deductions: number
  bonuses: number
  netPaid: number
  paidAt: string
  paymentMode: string
}

const root = '/owner/staff'

export async function getStaffRoles(pgId: string) {
  return apiGet<{ items: StaffRole[] }>(`${root}/roles`, { pgId })
}

export async function createStaffRole(payload: { pgId: string; name: string; color: string }) {
  return apiPost<StaffRole>(`${root}/roles`, payload)
}

export async function updateStaffRole(id: string, payload: { name: string; color: string }) {
  return apiPatch<StaffRole>(`${root}/roles/${id}`, payload)
}

export async function deleteStaffRole(id: string) {
  return apiDelete<{ message: string }>(`${root}/roles/${id}`)
}

export async function getStaffEmployees(pgId: string) {
  return apiGet<{ items: StaffEmployee[] }>(root, { pgId })
}

export async function createStaffEmployee(payload: {
  name: string
  phone: string
  email?: string
  pgId: string
  roleId: string
  monthlySalary: number
  joiningDate: string
  address?: string
  notes?: string
}) {
  return apiPost<StaffEmployee>(root, payload)
}

export async function updateStaffEmployee(id: string, payload: Partial<Omit<StaffEmployee, '_id' | 'pgId' | 'roleId'>> & { roleId?: string }) {
  return apiPatch<StaffEmployee>(`${root}/${id}`, payload)
}

export async function resignStaffEmployee(id: string) {
  return apiDelete<{ message: string; item: StaffEmployee }>(`${root}/${id}`)
}

export async function getStaffAttendance(pgId: string, date: string) {
  return apiGet<{ items: StaffAttendance[] }>(`${root}/attendance`, { pgId, date })
}

export async function getStaffMonthlyAttendance(pgId: string, month: number, year: number) {
  return apiGet<{ items: StaffAttendance[] }>(`${root}/attendance`, { pgId, month, year })
}

export async function saveStaffAttendance(payload: {
  pgId: string
  date: string
  records: Array<{ employeeId: string; status: StaffAttendance['status']; checkIn?: string; checkOut?: string }>
}) {
  return apiPost<{ savedCount: number; items: StaffAttendance[] }>(`${root}/attendance/bulk`, payload)
}

export async function getStaffExpenses(pgId: string, month: number, year: number) {
  return apiGet<{ items: StaffExpense[]; totalAmount: number }>(`${root}/expenses`, { pgId, month, year })
}

export async function createStaffExpense(payload: {
  pgId: string
  employeeId: string
  amount: number
  description: string
  category: string
  expenseDate: string
}) {
  return apiPost<StaffExpense>(`${root}/expenses`, payload)
}

export async function updateStaffExpense(id: string, payload: Partial<Pick<StaffExpense, 'employeeId' | 'amount' | 'description' | 'category' | 'expenseDate'>>) {
  return apiPatch<StaffExpense>(`${root}/expenses/${id}`, payload)
}

export async function deleteStaffExpense(id: string) {
  return apiDelete<{ message: string }>(`${root}/expenses/${id}`)
}

export async function getStaffLeaves(pgId: string) {
  return apiGet<{ items: StaffLeave[] }>(`${root}/leaves`, { pgId })
}

export async function createStaffLeave(payload: {
  pgId: string
  employeeId: string
  startDate: string
  endDate: string
  leaveType: string
  reason?: string
}) {
  return apiPost<StaffLeave>(`${root}/leaves`, payload)
}

export async function updateStaffLeaveStatus(id: string, status: 'approve' | 'reject') {
  return apiPatch<StaffLeave>(`${root}/leaves/${id}/${status}`, {})
}

export async function deleteStaffLeave(id: string) {
  return apiDelete<{ message: string }>(`${root}/leaves/${id}`)
}

export async function getStaffSalary(pgId: string, month: number, year: number) {
  return apiGet<{ items: StaffSalary[] }>(`${root}/salary`, { pgId, month, year })
}

export async function getStaffSalaryHistory(employeeId: string) {
  return apiGet<{ items: StaffSalary[] }>(`${root}/${employeeId}/salary-history`)
}

export async function createStaffSalary(payload: {
  pgId: string
  employeeId: string
  month: number
  year: number
  deductions: number
  bonuses: number
  paidAt: string
  paymentMode: string
}) {
  return apiPost<StaffSalary>(`${root}/salary`, payload)
}

export async function deleteStaffSalary(id: string) {
  return apiDelete<{ message: string }>(`${root}/salary/${id}`)
}
