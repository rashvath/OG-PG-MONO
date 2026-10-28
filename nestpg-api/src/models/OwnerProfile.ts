import { Schema, model } from 'mongoose'

const ownerProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    phone: { type: String, default: '' },
    profilePhoto: { type: String, default: '' },
    address: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    pgLimit: { type: Number, default: 5 },
    pgCreationEnabled: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: false },
  },
  { timestamps: true },
)

ownerProfileSchema.index({ status: 1 })

export const OwnerProfileModel = model('OwnerProfile', ownerProfileSchema)
