import { Schema, model } from 'mongoose'

const tenantProfileUpdateRequestSchema = new Schema(
  {
    tenantUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    requestedName: { type: String, default: '' },
    requestedPhone: { type: String, default: '' },
    requestedEmail: { type: String, default: '' },
    requestedEmergencyContact: { type: String, default: '' },
    requestedEmergencyPhone: { type: String, default: '' },
    requestedAddress: { type: String, default: '' },
    requestedFields: {
      type: [String],
      default: [],
      enum: ['name', 'phone', 'email', 'profileAddress', 'emergencyContactName', 'emergencyContactPhone'],
    },
    currentValues: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      profileAddress: { type: String, default: '' },
      emergencyContactName: { type: String, default: '' },
      emergencyContactPhone: { type: String, default: '' },
    },
    proposedValues: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      profileAddress: { type: String, default: '' },
      emergencyContactName: { type: String, default: '' },
      emergencyContactPhone: { type: String, default: '' },
    },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    rejectionReason: { type: String, default: '' },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
)

tenantProfileUpdateRequestSchema.index({ tenantUserId: 1, createdAt: -1 })
tenantProfileUpdateRequestSchema.index({ ownerId: 1, pgId: 1, status: 1 })

export const TenantProfileUpdateRequestModel = model('TenantProfileUpdateRequest', tenantProfileUpdateRequestSchema)