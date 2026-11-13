import { Schema, model } from 'mongoose'

const tenantPaymentProofSchema = new Schema(
  {
    tenantUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    amount: { type: Number, required: true },
    paidForMonth: { type: String, default: '' },
    transactionRef: { type: String, default: '' },
    screenshotUrl: { type: String, required: true, trim: true },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

tenantPaymentProofSchema.index({ tenantUserId: 1, createdAt: -1 })
tenantPaymentProofSchema.index({ ownerId: 1, pgId: 1, status: 1 })

export const TenantPaymentProofModel = model('TenantPaymentProof', tenantPaymentProofSchema)