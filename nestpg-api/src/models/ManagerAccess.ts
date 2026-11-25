import { Schema, Types, model } from 'mongoose'

export const MANAGER_MODULES = [
  'pgs', 'residents', 'inventory', 'enquiries', 'finance', 'documents', 'staff', 'tenantReview',
] as const
export type ManagerModule = (typeof MANAGER_MODULES)[number]
export type ManagerAction = 'read' | 'create' | 'update' | 'delete'
export type ManagerPermissions = Record<ManagerModule, Record<ManagerAction, boolean>>
type ManagerAccess = {
  managerId: Types.ObjectId
  ownerId?: Types.ObjectId
  pgId: Types.ObjectId
  permissions: ManagerPermissions
  createdBy: Types.ObjectId
}

const permissionsSchema = new Schema(
  Object.fromEntries(MANAGER_MODULES.map((key) => [key, {
    read: { type: Boolean, default: false }, create: { type: Boolean, default: false },
    update: { type: Boolean, default: false }, delete: { type: Boolean, default: false },
  }])),
  { _id: false },
)

const managerAccessSchema = new Schema<ManagerAccess>({
  managerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  permissions: { type: permissionsSchema, required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true })

export const ManagerAccessModel = model<ManagerAccess>('ManagerAccess', managerAccessSchema)
