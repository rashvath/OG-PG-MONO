import type { NextFunction, Response } from 'express'
import mongoose from 'mongoose'
import type { AuthedRequest } from './auth'
import { ManagerAccessModel, type ManagerAction, type ManagerModule } from '../models/ManagerAccess'
import { ResidentModel } from '../models/Resident'
import { RoomModel } from '../models/Room'
import { BedModel } from '../models/Bed'
import { FloorModel } from '../models/Floor'
import { LedgerEntryModel } from '../models/LedgerEntry'
import { BalanceSheetModel } from '../models/BalanceSheet'
import { OwnerDocumentModel } from '../models/OwnerDocument'
import { EmployeeModel } from '../models/Employee'
import { EmployeeExpenseModel } from '../models/EmployeeExpense'
import { EmployeeLeaveModel } from '../models/EmployeeLeave'
import { AttendanceModel } from '../models/Attendance'
import { SalaryPaymentModel } from '../models/SalaryPayment'
import { CustomRoleModel } from '../models/CustomRole'
import { TenantComplaintModel } from '../models/TenantComplaint'
import { TenantPaymentProofModel } from '../models/TenantPaymentProof'
import { TenantAbsenceModel } from '../models/TenantAbsence'
import { TenantProfileUpdateRequestModel } from '../models/TenantProfileUpdateRequest'
import { UserModel } from '../models/User'

const resourceModels = [ResidentModel, RoomModel, BedModel, FloorModel, LedgerEntryModel, BalanceSheetModel, OwnerDocumentModel, EmployeeModel, EmployeeExpenseModel, EmployeeLeaveModel, AttendanceModel, SalaryPaymentModel, CustomRoleModel, TenantComplaintModel, TenantPaymentProofModel, TenantAbsenceModel, TenantProfileUpdateRequestModel]

function moduleFor(path: string): ManagerModule | null {
  if (path.startsWith('/staff')) return 'staff'
  if (path.startsWith('/review') || path.startsWith('/approvals')) return 'tenantReview'
  if (path.startsWith('/residents')) return 'residents'
  if (path.startsWith('/enquiries')) return 'enquiries'
  if (path.startsWith('/documents')) return 'documents'
  if (path.startsWith('/ledger') || path.startsWith('/balance-sheets')) return 'finance'
  if (path.startsWith('/pgs/')) return /^\/pgs\/[^/]+\/(inventory|floors|rooms|beds)/.test(path) ? 'inventory' : 'pgs'
  if (path === '/pgs') return 'pgs'
  return null
}

function actionFor(method: string, path: string): ManagerAction {
  if (method === 'GET' || method === 'HEAD') return 'read'
  if (method === 'POST' && /\/(?:mark-left|move|initialize-beds)$/.test(path)) return 'update'
  if (method === 'POST') return 'create'
  if (method === 'DELETE') return 'delete'
  return 'update'
}

export async function managerAccess(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'manager') { next(); return }
  if (req.path === '/manager/access') { next(); return }
  const module = moduleFor(req.path)
  if (!module) { res.status(403).json({ message: 'This area is not available to managers' }); return }
  const access = await ManagerAccessModel.findOne({ managerId: req.user.sub }).lean()
  if (!access) { res.status(403).json({ message: 'Manager access has been revoked' }); return }
  const manager = await UserModel.findById(req.user.sub).select('status').lean()
  if (!manager || manager.status !== 'active') { res.status(403).json({ message: 'Manager account is inactive' }); return }
  const action = actionFor(req.method, req.path)
  const permissions = access.permissions as Record<string, Record<string, boolean>>
  const contextOnlyPgList = req.method === 'GET' && req.path === '/pgs' && Object.entries(permissions).some(([key, grants]) => key !== 'pgs' && Object.values(grants ?? {}).some(Boolean))
  if (!permissions[module]?.[action] && !contextOnlyPgList) { res.status(403).json({ message: `Owner has not allowed ${action} access for ${module}` }); return }

  const pgId = String(access.pgId)
  const bodyPgId = req.body && typeof req.body.pgId === 'string' ? req.body.pgId : undefined
  const queryPgId = typeof req.query.pgId === 'string' ? req.query.pgId : undefined
  const pathPgId = req.path.startsWith('/pgs/') ? req.path.split('/')[2] : undefined
  if ([bodyPgId, queryPgId, pathPgId].some((value) => value && value !== pgId)) {
    res.status(403).json({ message: 'Manager is limited to the assigned PG' }); return
  }
  req.query.pgId = pgId
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) req.body.pgId ??= pgId

  const id = req.path.match(/^\/(?:residents|documents)\/([^/]+)|^\/ledger\/entries\/([^/]+)|^\/balance-sheets\/([^/]+)|^\/staff\/(?:attendance|expenses|leaves|salary|roles)\/([^/]+)|^\/staff\/([^/]+)|^\/review\/(?:complaints|payment-proofs|absences|profile-update-requests)\/([^/]+)|^\/approvals\/([^/]+)/)?.slice(1).find(Boolean)
  if (id && mongoose.isValidObjectId(id) && !req.path.startsWith('/pgs/')) {
    if (req.path.startsWith('/approvals/')) {
      const tenant = await UserModel.exists({ _id: id, tenantPgId: pgId, tenantOwnerId: access.ownerId } as never)
      if (!tenant) { res.status(404).json({ message: 'Tenant not found in the assigned PG' }); return }
    } else {
    let belongsToPg = false
    for (const model of resourceModels) {
      const found = await (model as unknown as mongoose.Model<Record<string, unknown>>).exists({ _id: id, pgId })
      if (found) { belongsToPg = true; break }
    }
    if (!belongsToPg) { res.status(404).json({ message: 'Record not found in the assigned PG' }); return }
    }
  }

  req.user.ownerId = String(access.ownerId)
  req.user.pgId = pgId
  next()
}
