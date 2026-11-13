import { Schema, model } from 'mongoose'

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true },
    profileAddress: { type: String, default: '' },
    emergencyContactName: { type: String, default: '' },
    emergencyContactPhone: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'owner', 'admin', 'tenant'], default: 'customer' },
    status: { type: String, enum: ['active', 'blocked'], default: 'active' },
    tenantApprovalStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    tenantPgId: { type: Schema.Types.ObjectId, ref: 'Listing', default: null },
    tenantOwnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    tenantApprovalReviewedAt: { type: Date, default: null },
    tenantApprovalReviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    tenantApprovalReason: { type: String, default: '' },
  },
  { timestamps: true },
)

userSchema.index({ role: 1, tenantApprovalStatus: 1 })

export const UserModel = model('User', userSchema)
