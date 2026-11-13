import { Schema, model } from 'mongoose'

const tenantAbsenceSchema = new Schema(
  {
    tenantUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

tenantAbsenceSchema.index({ tenantUserId: 1, createdAt: -1 })
tenantAbsenceSchema.index({ ownerId: 1, pgId: 1, status: 1 })

export const TenantAbsenceModel = model('TenantAbsence', tenantAbsenceSchema)