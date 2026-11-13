import { Schema, model } from 'mongoose'

const tenantComplaintSchema = new Schema(
  {
    tenantUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: { type: String, enum: ['open', 'in_progress', 'resolved', 'rejected'], default: 'open' },
    resolutionNote: { type: String, default: '' },
    resolvedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

tenantComplaintSchema.index({ tenantUserId: 1, createdAt: -1 })
tenantComplaintSchema.index({ ownerId: 1, pgId: 1, status: 1 })

export const TenantComplaintModel = model('TenantComplaint', tenantComplaintSchema)