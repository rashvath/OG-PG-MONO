import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { getOwnerPgs, type OwnerPg } from '@/api/owner-api'
import {
  createStaffEmployee,
  createStaffExpense,
  createStaffLeave,
  createStaffRole,
  createStaffSalary,
  deleteStaffExpense,
  deleteStaffLeave,
  deleteStaffRole,
  deleteStaffSalary,
  getStaffAttendance,
  getStaffEmployees,
  getStaffExpenses,
  getStaffLeaves,
  getStaffMonthlyAttendance,
  getStaffRoles,
  getStaffSalary,
  getStaffSalaryHistory,
  resignStaffEmployee,
  saveStaffAttendance,
  updateStaffEmployee,
  updateStaffExpense,
  updateStaffLeaveStatus,
  updateStaffRole,
  type StaffAttendance,
  type StaffEmployee,
  type StaffExpense,
  type StaffLeave,
  type StaffRole,
  type StaffSalary,
} from '@/api/staff-api'
import { useToast } from '@/lib/toast'

type Tab = 'employees' | 'roles' | 'attendance' | 'expenses' | 'leaves' | 'salary'
type AttendanceDraft = { status: StaffAttendance['status']; checkIn: string; checkOut: string }

const today = () => new Date().toISOString().slice(0, 10)
const monthNow = new Date().getMonth() + 1
const yearNow = new Date().getFullYear()
const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'employees', label: 'Employees & roles' },
  { id: 'roles', label: 'Manage Roles' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'leaves', label: 'Leave' },
  { id: 'salary', label: 'Salary' },
]

function personName(value: { name: string } | string) {
  return typeof value === 'string' ? value : value.name
}

function money(value: number) {
  return `₹${value.toLocaleString('en-IN')}`
}

function csvCell(value: unknown) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

export function OwnerStaffPage() {
  const toast = useToast()
  const [pgs, setPgs] = useState<OwnerPg[]>([])
  const [pgId, setPgId] = useState('')
  const [tab, setTab] = useState<Tab>('employees')
  const [employees, setEmployees] = useState<StaffEmployee[]>([])
  const [roles, setRoles] = useState<StaffRole[]>([])
  const [attendance, setAttendance] = useState<StaffAttendance[]>([])
  const [monthlyAttendance, setMonthlyAttendance] = useState<StaffAttendance[]>([])
  const [attendanceDraft, setAttendanceDraft] = useState<Record<string, AttendanceDraft>>({})
  const [expenses, setExpenses] = useState<StaffExpense[]>([])
  const [expenseTotal, setExpenseTotal] = useState(0)
  const [leaves, setLeaves] = useState<StaffLeave[]>([])
  const [salary, setSalary] = useState<StaffSalary[]>([])
  const [salaryHistory, setSalaryHistory] = useState<StaffSalary[]>([])
  const [salaryHistoryEmployeeId, setSalaryHistoryEmployeeId] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(today())
  const [month, setMonth] = useState(monthNow)
  const [year, setYear] = useState(yearNow)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<StaffEmployee | null>(null)
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null)
  const [editingExpense, setEditingExpense] = useState<StaffExpense | null>(null)
  const [employeeForm, setEmployeeForm] = useState({
    name: '', phone: '', email: '', roleId: '', monthlySalary: '', joiningDate: today(), address: '', notes: '',
  })
  const [roleForm, setRoleForm] = useState({ name: '', color: '#6366f1' })
  const [expenseForm, setExpenseForm] = useState({
    employeeId: '', amount: '', description: '', category: 'supplies', expenseDate: today(),
  })
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '', startDate: today(), endDate: today(), leaveType: 'casual', reason: '',
  })
  const [salaryForm, setSalaryForm] = useState({
    employeeId: '', deductions: '0', bonuses: '0', paidAt: today(), paymentMode: 'cash',
  })

  const activeEmployees = useMemo(() => employees.filter((employee) => employee.status === 'active'), [employees])
  const monthlyAttendanceSummary = useMemo(() => {
    const summary: Record<string, { present: number; absent: number; halfDay: number; onLeave: number }> = {}
    for (const record of monthlyAttendance) {
      const employeeId = typeof record.employeeId === 'string' ? record.employeeId : record.employeeId._id
      const counts = summary[employeeId] ?? { present: 0, absent: 0, halfDay: 0, onLeave: 0 }
      if (record.status === 'present') counts.present += 1
      else if (record.status === 'absent') counts.absent += 1
      else if (record.status === 'half-day') counts.halfDay += 1
      else counts.onLeave += 1
      summary[employeeId] = counts
    }
    return summary
  }, [monthlyAttendance])

  useEffect(() => {
    getOwnerPgs()
      .then(({ items }) => {
        setPgs(items)
        setPgId((current) => current || items[0]?._id || '')
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load PGs'))
  }, [toast])

  useEffect(() => {
    if (!pgId) return
    let cancelled = false
    setIsLoading(true)
    Promise.all([
      getStaffEmployees(pgId),
      getStaffRoles(pgId),
      getStaffAttendance(pgId, attendanceDate),
      getStaffMonthlyAttendance(pgId, month, year),
      getStaffExpenses(pgId, month, year),
      getStaffLeaves(pgId),
      getStaffSalary(pgId, month, year),
    ])
      .then(([employeeData, roleData, attendanceData, monthlyAttendanceData, expenseData, leaveData, salaryData]) => {
        if (cancelled) return
        setEmployees(employeeData.items)
        setRoles(roleData.items)
        setAttendance(attendanceData.items)
        setMonthlyAttendance(monthlyAttendanceData.items)
        setExpenses(expenseData.items)
        setExpenseTotal(expenseData.totalAmount)
        setLeaves(leaveData.items)
        setSalary(salaryData.items)
        const nextDraft: Record<string, AttendanceDraft> = {}
        const byEmployee = new Map(attendanceData.items.map((item) => [
          typeof item.employeeId === 'string' ? item.employeeId : item.employeeId._id,
          item,
        ]))
        for (const employee of employeeData.items.filter((item) => item.status === 'active')) {
          const record = byEmployee.get(employee._id)
          nextDraft[employee._id] = {
            status: record?.status ?? 'present',
            checkIn: record?.checkIn ?? '',
            checkOut: record?.checkOut ?? '',
          }
        }
        setAttendanceDraft(nextDraft)
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : 'Unable to load staff data')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [pgId, attendanceDate, month, year, toast])

  const refresh = async () => {
    if (!pgId) return
    const [employeeData, roleData, attendanceData, monthlyAttendanceData, expenseData, leaveData, salaryData] = await Promise.all([
      getStaffEmployees(pgId),
      getStaffRoles(pgId),
      getStaffAttendance(pgId, attendanceDate),
      getStaffMonthlyAttendance(pgId, month, year),
      getStaffExpenses(pgId, month, year),
      getStaffLeaves(pgId),
      getStaffSalary(pgId, month, year),
    ])
    setEmployees(employeeData.items)
    setRoles(roleData.items)
    setAttendance(attendanceData.items)
    setMonthlyAttendance(monthlyAttendanceData.items)
    setExpenses(expenseData.items)
    setExpenseTotal(expenseData.totalAmount)
    setLeaves(leaveData.items)
    setSalary(salaryData.items)
    const byEmployee = new Map(attendanceData.items.map((item) => [
      typeof item.employeeId === 'string' ? item.employeeId : item.employeeId._id,
      item,
    ]))
    setAttendanceDraft(Object.fromEntries(employeeData.items
      .filter((employee) => employee.status === 'active')
      .map((employee) => {
        const record = byEmployee.get(employee._id)
        return [employee._id, {
          status: record?.status ?? 'present',
          checkIn: record?.checkIn ?? '',
          checkOut: record?.checkOut ?? '',
        }]
      })))
  }

  const save = async (action: () => Promise<unknown>, successMessage: string) => {
    setIsSaving(true)
    try {
      await action()
      await refresh()
      toast.success(successMessage)
      return true
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save staff changes')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  const submitEmployee = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pgId || !employeeForm.roleId) {
      toast.warning('Select a PG and employee role')
      return
    }
    const payload = {
      name: employeeForm.name.trim(),
      phone: employeeForm.phone.trim(),
      email: employeeForm.email.trim(),
      roleId: employeeForm.roleId,
      monthlySalary: Number(employeeForm.monthlySalary),
      joiningDate: employeeForm.joiningDate,
      address: employeeForm.address.trim(),
      notes: employeeForm.notes.trim(),
    }
    const done = await save(
      () => editingEmployee
        ? updateStaffEmployee(editingEmployee._id, payload)
        : createStaffEmployee({ ...payload, pgId }),
      editingEmployee ? 'Employee updated' : 'Employee added',
    )
    if (done) {
      setEditingEmployee(null)
      setEmployeeForm({ name: '', phone: '', email: '', roleId: '', monthlySalary: '', joiningDate: today(), address: '', notes: '' })
    }
  }

  const editEmployee = (employee: StaffEmployee) => {
    setEditingEmployee(employee)
    setEmployeeForm({
      name: employee.name,
      phone: employee.phone,
      email: employee.email ?? '',
      roleId: typeof employee.roleId === 'string' ? employee.roleId : employee.roleId._id,
      monthlySalary: String(employee.monthlySalary),
      joiningDate: employee.joiningDate.slice(0, 10),
      address: employee.address ?? '',
      notes: employee.notes ?? '',
    })
  }

  const submitRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!pgId) return
    const done = await save(
      () => editingRole
        ? updateStaffRole(editingRole._id, roleForm)
        : createStaffRole({ ...roleForm, pgId }),
      editingRole ? 'Role updated' : 'Role added',
    )
    if (done) {
      setEditingRole(null)
      setRoleForm({ name: '', color: '#6366f1' })
    }
  }

  const submitAttendance = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void save(() => saveStaffAttendance({
      pgId,
      date: attendanceDate,
      records: activeEmployees.map((employee) => ({
        employeeId: employee._id,
        status: attendanceDraft[employee._id]?.status ?? 'present',
        ...(attendanceDraft[employee._id]?.checkIn ? { checkIn: attendanceDraft[employee._id].checkIn } : {}),
        ...(attendanceDraft[employee._id]?.checkOut ? { checkOut: attendanceDraft[employee._id].checkOut } : {}),
      })),
    }), 'Attendance saved')
  }

  const submitExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload = {
      employeeId: expenseForm.employeeId,
      amount: Number(expenseForm.amount),
      description: expenseForm.description.trim(),
      category: expenseForm.category,
      expenseDate: expenseForm.expenseDate,
    }
    void save(() => editingExpense
      ? updateStaffExpense(editingExpense._id, payload)
      : createStaffExpense({ ...payload, pgId }), editingExpense ? 'Expense updated' : 'Expense recorded').then((done) => {
      if (done) {
        setEditingExpense(null)
        setExpenseForm({ employeeId: '', amount: '', description: '', category: 'supplies', expenseDate: today() })
      }
    })
  }

  const submitLeave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void save(() => createStaffLeave({
      ...leaveForm,
      pgId,
      reason: leaveForm.reason.trim(),
    }), 'Leave request recorded').then((done) => {
      if (done) setLeaveForm({ employeeId: '', startDate: today(), endDate: today(), leaveType: 'casual', reason: '' })
    })
  }

  const submitSalary = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void save(() => createStaffSalary({
      pgId,
      employeeId: salaryForm.employeeId,
      month,
      year,
      deductions: Number(salaryForm.deductions),
      bonuses: Number(salaryForm.bonuses),
      paidAt: salaryForm.paidAt,
      paymentMode: salaryForm.paymentMode,
    }), 'Salary payment recorded').then((done) => {
      if (done) setSalaryForm({ employeeId: '', deductions: '0', bonuses: '0', paidAt: today(), paymentMode: 'cash' })
    })
  }

  const loadSalaryHistory = async (employeeId: string) => {
    setSalaryHistoryEmployeeId(employeeId)
    if (!employeeId) {
      setSalaryHistory([])
      return
    }
    try {
      const { items } = await getStaffSalaryHistory(employeeId)
      setSalaryHistory(items)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load salary history')
    }
  }

  const exportCsv = () => {
    const columns: Record<Tab, { name: string; rows: unknown[][] }> = {
      employees: {
        name: 'employees',
        rows: employees.map((item) => [
          item.name, item.phone, item.email, personName(item.roleId as StaffRole | string), item.monthlySalary, item.joiningDate, item.status,
        ]),
      },
      roles: {
        name: 'roles',
        rows: roles.map((item) => [item.name, item.color]),
      },
      attendance: {
        name: 'attendance',
        rows: attendance.map((item) => [personName(item.employeeId), item.date.slice(0, 10), item.status, item.checkIn, item.checkOut]),
      },
      expenses: {
        name: 'expenses',
        rows: expenses.map((item) => [personName(item.employeeId), item.expenseDate.slice(0, 10), item.category, item.description, item.amount]),
      },
      leaves: {
        name: 'leaves',
        rows: leaves.map((item) => [personName(item.employeeId), item.leaveType, item.startDate.slice(0, 10), item.endDate.slice(0, 10), item.totalDays, item.status]),
      },
      salary: {
        name: 'salary',
        rows: salary.map((item) => [personName(item.employeeId), `${item.year}-${String(item.month).padStart(2, '0')}`, item.baseSalary, item.deductions, item.bonuses, item.netPaid, item.paymentMode]),
      },
    }
    const headers: Record<Tab, string[]> = {
      employees: ['Name', 'Phone', 'Email', 'Role', 'Monthly salary', 'Joining date', 'Status'],
      roles: ['Role', 'Color'],
      attendance: ['Employee', 'Date', 'Status', 'Check in', 'Check out'],
      expenses: ['Employee', 'Date', 'Category', 'Description', 'Amount'],
      leaves: ['Employee', 'Type', 'Start date', 'End date', 'Days', 'Status'],
      salary: ['Employee', 'Month', 'Base salary', 'Deductions', 'Bonus', 'Net paid', 'Payment mode'],
    }
    const data = [headers[tab], ...columns[tab].rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([data], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `staff-${columns[tab].name}-${pgId}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const updateDraft = (employeeId: string, value: Partial<AttendanceDraft>) => {
    setAttendanceDraft((current) => ({
      ...current,
      [employeeId]: { ...current[employeeId], ...value },
    }))
  }

  return (
    <div className="finance-shell">
      <div className="admin-hero-row">
        <div>
          <h2 className="page-heading">Staff management</h2>
          <p className="section-sub">Manage PG employees, attendance, expenses, leave and salary records.</p>
        </div>
        <button type="button" className="btn btn-line" onClick={exportCsv} disabled={!pgId}>Export CSV</button>
      </div>

      <div className="panel form-grid two-col spaced-top">
        <div className="form-field">
          <label htmlFor="staff-pg-select">PG</label>
          <select id="staff-pg-select" value={pgId} onChange={(event) => setPgId(event.target.value)}>
            <option value="">Select PG</option>
            {pgs.map((pg) => <option key={pg._id} value={pg._id}>{pg.name}</option>)}
          </select>
        </div>
        {(tab === 'expenses' || tab === 'salary' || tab === 'attendance') ? (
          <>
            <div className="form-field">
              <label htmlFor="staff-month">Month</label>
              <select id="staff-month" value={month} onChange={(event) => setMonth(Number(event.target.value))}>
                {Array.from({ length: 12 }, (_, index) => (
                  <option key={index + 1} value={index + 1}>{new Date(2000, index).toLocaleString('en', { month: 'long' })}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="staff-year">Year</label>
              <input id="staff-year" type="number" min="2000" max="2200" value={year} onChange={(event) => setYear(Number(event.target.value))} />
            </div>
          </>
        ) : null}
      </div>

      <div className="table-action-row spaced-top" role="tablist" aria-label="Staff management sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'btn btn-brand' : 'btn btn-line'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {!pgId ? (
        <div className="panel spaced-top">Add or assign a PG to your owner account to manage its staff.</div>
      ) : isLoading ? (
        <div className="panel spaced-top">Loading staff records...</div>
      ) : (
        <>
          {tab === 'employees' ? (
            <>
              <form className="panel form-grid two-col spaced-top" onSubmit={(event) => void submitEmployee(event)}>
                <h3 className="finance-title span-all">{editingEmployee ? 'Edit employee' : 'Add employee'}</h3>
                <div className="form-field"><label htmlFor="employee-name">Name</label><input id="employee-name" required minLength={2} value={employeeForm.name} onChange={(event) => setEmployeeForm({ ...employeeForm, name: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="employee-phone">Phone</label><input id="employee-phone" required pattern="[0-9]{10}" value={employeeForm.phone} onChange={(event) => setEmployeeForm({ ...employeeForm, phone: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="employee-email">Email</label><input id="employee-email" type="email" value={employeeForm.email} onChange={(event) => setEmployeeForm({ ...employeeForm, email: event.target.value })} /></div>
                <div className="form-field">
                  <label htmlFor="employee-role">Role</label>
                  <select id="employee-role" required value={employeeForm.roleId} onChange={(event) => setEmployeeForm({ ...employeeForm, roleId: event.target.value })}>
                    {roles.length === 0
                      ? <option value="" disabled style={{ color: '#b45309' }}>No roles yet — add one in Manage Roles first</option>
                      : <option value="">Select role</option>}
                    {roles.map((role) => <option key={role._id} value={role._id}>{role.name}</option>)}
                  </select>
                  {roles.length === 0 ? (
                    <button type="button" className="inline-link-button" onClick={() => setTab('roles')}>
                      → Open Manage Roles
                    </button>
                  ) : null}
                </div>
                <div className="form-field"><label htmlFor="employee-salary">Monthly salary (₹)</label><input id="employee-salary" type="number" min="0" required value={employeeForm.monthlySalary} onChange={(event) => setEmployeeForm({ ...employeeForm, monthlySalary: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="employee-joining">Joining date</label><input id="employee-joining" type="date" required value={employeeForm.joiningDate} onChange={(event) => setEmployeeForm({ ...employeeForm, joiningDate: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="employee-address">Address</label><input id="employee-address" value={employeeForm.address} onChange={(event) => setEmployeeForm({ ...employeeForm, address: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="employee-notes">Notes</label><input id="employee-notes" value={employeeForm.notes} onChange={(event) => setEmployeeForm({ ...employeeForm, notes: event.target.value })} /></div>
                <div className="table-action-row span-all">
                  <button className="btn btn-brand" type="submit" disabled={isSaving || roles.length === 0}>{isSaving ? 'Saving...' : editingEmployee ? 'Save changes' : 'Add employee'}</button>
                  {editingEmployee ? <button className="btn btn-line" type="button" onClick={() => { setEditingEmployee(null); setEmployeeForm({ name: '', phone: '', email: '', roleId: '', monthlySalary: '', joiningDate: today(), address: '', notes: '' }) }}>Cancel edit</button> : null}
                </div>
              </form>

              <div className="panel spaced-top">
                <h3 className="finance-title">Employees</h3>
                {employees.length === 0 ? <p className="section-sub">No employees in this PG yet.</p> : (
                  <div className="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Monthly salary</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>{employees.map((employee) => (
                      <tr key={employee._id}>
                        <td>{employee.name}</td><td>{employee.phone}</td><td>{personName(employee.roleId)}</td><td>{money(employee.monthlySalary)}</td><td>{employee.status}</td>
                        <td><div className="table-action-row"><button type="button" className="btn btn-line" onClick={() => editEmployee(employee)}>Edit</button>{employee.status !== 'resigned' ? <button type="button" className="btn btn-line" disabled={isSaving} onClick={() => void save(() => resignStaffEmployee(employee._id), 'Employee marked as resigned')}>Resign</button> : null}</div></td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                )}
              </div>

            </>
          ) : null}

          {tab === 'roles' ? (
            <section className="panel form-grid two-col spaced-top">
              <h3 className="finance-title span-all">Manage Roles</h3>
              <form className="span-all form-grid two-col" onSubmit={(event) => void submitRole(event)}>
                <h4 className="finance-title span-all">{editingRole ? 'Edit staff role' : 'Add staff role'}</h4>
                <div className="form-field"><label htmlFor="role-name">Role name</label><input id="role-name" minLength={2} maxLength={60} required value={roleForm.name} onChange={(event) => setRoleForm({ ...roleForm, name: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="role-color">Label color</label><input id="role-color" type="color" value={roleForm.color} onChange={(event) => setRoleForm({ ...roleForm, color: event.target.value })} /></div>
                <div className="table-action-row span-all"><button type="submit" className="btn btn-brand" disabled={isSaving}>{editingRole ? 'Save role' : 'Add role'}</button>{editingRole ? <button type="button" className="btn btn-line" onClick={() => { setEditingRole(null); setRoleForm({ name: '', color: '#6366f1' }) }}>Cancel</button> : null}</div>
              </form>
              <div className="span-all">
                {roles.length === 0
                  ? <p className="section-sub">No roles yet. Add a role to assign it to staff.</p>
                  : roles.map((role) => <span key={role._id} className="staff-role-chip" style={{ borderColor: role.color }}><span>{role.name}</span><button type="button" onClick={() => { setEditingRole(role); setRoleForm({ name: role.name, color: role.color }) }}>Edit</button><button type="button" onClick={() => void save(() => deleteStaffRole(role._id), 'Role deleted')}>Delete</button></span>)}
              </div>
            </section>
          ) : null}

          {tab === 'attendance' ? (
            <form className="panel spaced-top" onSubmit={submitAttendance}>
              <div className="admin-hero-row"><div><h3 className="finance-title">Daily attendance</h3><p className="section-sub">{attendance.length} saved record(s) for the selected date.</p></div><div className="form-field"><label htmlFor="attendance-date">Date</label><input id="attendance-date" type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} /></div></div>
              {activeEmployees.length === 0 ? <p className="section-sub">No active employees to mark.</p> : (
                <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Status</th><th>Check in</th><th>Check out</th></tr></thead>
                  <tbody>{activeEmployees.map((employee) => {
                    const draft = attendanceDraft[employee._id] ?? { status: 'present' as const, checkIn: '', checkOut: '' }
                    return <tr key={employee._id}><td>{employee.name}</td><td><select aria-label={`${employee.name} attendance status`} value={draft.status} onChange={(event) => updateDraft(employee._id, { status: event.target.value as AttendanceDraft['status'] })}>{['present', 'absent', 'half-day', 'on-leave'].map((status) => <option key={status} value={status}>{status}</option>)}</select></td><td><input aria-label={`${employee.name} check in`} type="time" value={draft.checkIn} onChange={(event) => updateDraft(employee._id, { checkIn: event.target.value })} /></td><td><input aria-label={`${employee.name} check out`} type="time" value={draft.checkOut} onChange={(event) => updateDraft(employee._id, { checkOut: event.target.value })} /></td></tr>
                  })}</tbody>
                </table></div>
              )}
              <div className="table-action-row spaced-top"><button className="btn btn-brand" type="submit" disabled={isSaving || activeEmployees.length === 0}>Save attendance</button></div>
            </form>
          ) : null}
          {tab === 'attendance' ? (
            <div className="panel spaced-top">
              <h3 className="finance-title">Monthly attendance summary · {month}/{year}</h3>
              <div className="table-wrap">
                <table><thead><tr><th>Employee</th><th>Present</th><th>Absent</th><th>Half day</th><th>On leave</th><th>Total marked</th></tr></thead>
                  <tbody>{employees.map((employee) => {
                    const counts = monthlyAttendanceSummary[employee._id] ?? { present: 0, absent: 0, halfDay: 0, onLeave: 0 }
                    return <tr key={employee._id}><td>{employee.name}</td><td>{counts.present}</td><td>{counts.absent}</td><td>{counts.halfDay}</td><td>{counts.onLeave}</td><td>{counts.present + counts.absent + counts.halfDay + counts.onLeave}</td></tr>
                  })}</tbody>
                </table>
              </div>
            </div>
          ) : null}

          {tab === 'expenses' ? (
            <>
              <div className="stats-grid spaced-top"><article className="panel"><span className="section-sub">Expenses this month</span><strong>{money(expenseTotal)}</strong></article></div>
              <form className="panel form-grid two-col spaced-top" onSubmit={submitExpense}>
                <h3 className="finance-title span-all">{editingExpense ? 'Edit employee expense' : 'Record employee expense'}</h3>
                <div className="form-field"><label htmlFor="expense-employee">Employee</label><select id="expense-employee" required value={expenseForm.employeeId} onChange={(event) => setExpenseForm({ ...expenseForm, employeeId: event.target.value })}><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}</select></div>
                <div className="form-field"><label htmlFor="expense-amount">Amount (₹)</label><input id="expense-amount" type="number" min="0.01" step="0.01" required value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="expense-description">Description</label><input id="expense-description" minLength={2} required value={expenseForm.description} onChange={(event) => setExpenseForm({ ...expenseForm, description: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="expense-category">Category</label><select id="expense-category" value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })}>{['food', 'supplies', 'maintenance', 'travel', 'utilities', 'other'].map((category) => <option key={category}>{category}</option>)}</select></div>
                <div className="form-field"><label htmlFor="expense-date">Date</label><input id="expense-date" type="date" required value={expenseForm.expenseDate} onChange={(event) => setExpenseForm({ ...expenseForm, expenseDate: event.target.value })} /></div>
                <div className="table-action-row span-all"><button className="btn btn-brand" type="submit" disabled={isSaving || employees.length === 0}>{editingExpense ? 'Save expense' : 'Add expense'}</button>{editingExpense ? <button className="btn btn-line" type="button" onClick={() => { setEditingExpense(null); setExpenseForm({ employeeId: '', amount: '', description: '', category: 'supplies', expenseDate: today() }) }}>Cancel</button> : null}</div>
              </form>
              <div className="panel spaced-top"><h3 className="finance-title">Expenses</h3>{expenses.length === 0 ? <p className="section-sub">No expenses recorded this month.</p> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Employee</th><th>Category</th><th>Description</th><th>Amount</th><th>Actions</th></tr></thead><tbody>{expenses.map((item) => <tr key={item._id}><td>{item.expenseDate.slice(0, 10)}</td><td>{personName(item.employeeId)}</td><td>{item.category}</td><td>{item.description}</td><td>{money(item.amount)}</td><td><div className="table-action-row"><button type="button" className="btn btn-line" onClick={() => { setEditingExpense(item); setExpenseForm({ employeeId: typeof item.employeeId === 'string' ? item.employeeId : item.employeeId._id, amount: String(item.amount), description: item.description, category: item.category, expenseDate: item.expenseDate.slice(0, 10) }) }}>Edit</button><button type="button" className="btn btn-line" onClick={() => void save(() => deleteStaffExpense(item._id), 'Expense deleted')}>Delete</button></div></td></tr>)}</tbody></table></div>}</div>
            </>
          ) : null}

          {tab === 'leaves' ? (
            <>
              <form className="panel form-grid two-col spaced-top" onSubmit={submitLeave}>
                <h3 className="finance-title span-all">Record leave request</h3>
                <div className="form-field"><label htmlFor="leave-employee">Employee</label><select id="leave-employee" required value={leaveForm.employeeId} onChange={(event) => setLeaveForm({ ...leaveForm, employeeId: event.target.value })}><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}</select></div>
                <div className="form-field"><label htmlFor="leave-type">Leave type</label><select id="leave-type" value={leaveForm.leaveType} onChange={(event) => setLeaveForm({ ...leaveForm, leaveType: event.target.value })}>{['sick', 'casual', 'annual', 'unpaid', 'emergency'].map((type) => <option key={type}>{type}</option>)}</select></div>
                <div className="form-field"><label htmlFor="leave-start">Start date</label><input id="leave-start" type="date" required value={leaveForm.startDate} onChange={(event) => setLeaveForm({ ...leaveForm, startDate: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="leave-end">End date</label><input id="leave-end" type="date" min={leaveForm.startDate} required value={leaveForm.endDate} onChange={(event) => setLeaveForm({ ...leaveForm, endDate: event.target.value })} /></div>
                <div className="form-field span-all"><label htmlFor="leave-reason">Reason</label><input id="leave-reason" value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} /></div>
                <div className="table-action-row span-all"><button className="btn btn-brand" type="submit" disabled={isSaving || employees.length === 0}>Add leave</button></div>
              </form>
              <div className="panel spaced-top"><h3 className="finance-title">Leave requests</h3>{leaves.length === 0 ? <p className="section-sub">No leave records.</p> : <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead><tbody>{leaves.map((item) => <tr key={item._id}><td>{personName(item.employeeId)}</td><td>{item.leaveType}</td><td>{item.startDate.slice(0, 10)} – {item.endDate.slice(0, 10)}</td><td>{item.totalDays}</td><td>{item.reason ?? '-'}</td><td>{item.status}</td><td>{item.status === 'pending' ? <div className="table-action-row"><button type="button" className="btn btn-line" onClick={() => void save(() => updateStaffLeaveStatus(item._id, 'approve'), 'Leave approved')}>Approve</button><button type="button" className="btn btn-line" onClick={() => void save(() => updateStaffLeaveStatus(item._id, 'reject'), 'Leave rejected')}>Reject</button><button type="button" className="btn btn-line" onClick={() => void save(() => deleteStaffLeave(item._id), 'Leave deleted')}>Delete</button></div> : '-'}</td></tr>)}</tbody></table></div>}</div>
            </>
          ) : null}

          {tab === 'salary' ? (
            <>
              <div className="stats-grid spaced-top"><article className="panel"><span className="section-sub">Salary paid</span><strong>{money(salary.reduce((sum, item) => sum + item.netPaid, 0))}</strong></article></div>
              <form className="panel form-grid two-col spaced-top" onSubmit={submitSalary}>
                <h3 className="finance-title span-all">Record salary payment</h3>
                <div className="form-field"><label htmlFor="salary-employee">Employee</label><select id="salary-employee" required value={salaryForm.employeeId} onChange={(event) => setSalaryForm({ ...salaryForm, employeeId: event.target.value })}><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name} · {money(employee.monthlySalary)}</option>)}</select></div>
                <div className="form-field"><label htmlFor="salary-deductions">Deductions (₹)</label><input id="salary-deductions" type="number" min="0" step="0.01" value={salaryForm.deductions} onChange={(event) => setSalaryForm({ ...salaryForm, deductions: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="salary-bonus">Bonus (₹)</label><input id="salary-bonus" type="number" min="0" step="0.01" value={salaryForm.bonuses} onChange={(event) => setSalaryForm({ ...salaryForm, bonuses: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="salary-paid-at">Paid on</label><input id="salary-paid-at" type="date" required value={salaryForm.paidAt} onChange={(event) => setSalaryForm({ ...salaryForm, paidAt: event.target.value })} /></div>
                <div className="form-field"><label htmlFor="salary-mode">Payment mode</label><select id="salary-mode" value={salaryForm.paymentMode} onChange={(event) => setSalaryForm({ ...salaryForm, paymentMode: event.target.value })}>{['cash', 'upi', 'bank'].map((mode) => <option key={mode}>{mode}</option>)}</select></div>
                <div className="table-action-row span-all"><button className="btn btn-brand" type="submit" disabled={isSaving || employees.length === 0}>Record payment</button></div>
              </form>
              <div className="panel spaced-top"><h3 className="finance-title">Salary history · {month}/{year}</h3>{salary.length === 0 ? <p className="section-sub">No salary payments recorded for this period.</p> : <div className="table-wrap"><table><thead><tr><th>Employee</th><th>Paid on</th><th>Base</th><th>Deductions</th><th>Bonus</th><th>Net paid</th><th>Mode</th><th></th></tr></thead><tbody>{salary.map((item) => <tr key={item._id}><td>{personName(item.employeeId)}</td><td>{item.paidAt.slice(0, 10)}</td><td>{money(item.baseSalary)}</td><td>{money(item.deductions)}</td><td>{money(item.bonuses)}</td><td>{money(item.netPaid)}</td><td>{item.paymentMode}</td><td><button type="button" className="btn btn-line" onClick={() => void save(() => deleteStaffSalary(item._id), 'Salary payment deleted')}>Delete</button></td></tr>)}</tbody></table></div>}</div>
              <div className="panel spaced-top">
                <h3 className="finance-title">Employee salary history</h3>
                <div className="form-field spaced-top"><label htmlFor="salary-history-employee">Employee</label><select id="salary-history-employee" value={salaryHistoryEmployeeId} onChange={(event) => void loadSalaryHistory(event.target.value)}><option value="">Select employee</option>{employees.map((employee) => <option key={employee._id} value={employee._id}>{employee.name}</option>)}</select></div>
                {salaryHistoryEmployeeId ? salaryHistory.length === 0 ? <p className="section-sub spaced-top">No salary payments recorded for this employee.</p> : <div className="table-wrap spaced-top"><table><thead><tr><th>Period</th><th>Paid on</th><th>Base</th><th>Deductions</th><th>Bonus</th><th>Net paid</th></tr></thead><tbody>{salaryHistory.map((item) => <tr key={item._id}><td>{item.month}/{item.year}</td><td>{item.paidAt.slice(0, 10)}</td><td>{money(item.baseSalary)}</td><td>{money(item.deductions)}</td><td>{money(item.bonuses)}</td><td>{money(item.netPaid)}</td></tr>)}</tbody></table></div> : null}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
