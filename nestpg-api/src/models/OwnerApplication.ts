import { Schema, model } from 'mongoose'

const ownerApplicationSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    pgName: { type: String, required: true },
    pgAddress: { type: String, required: true },
    area: { type: String, required: true },
    description: { type: String, default: '' },
    numberOfRooms: { type: Number, default: 0 },
    photos: [{ type: String }],
    rent: { type: Number, required: true },
    amenities: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

ownerApplicationSchema.index({ status: 1, createdAt: -1 })
ownerApplicationSchema.index({ ownerUserId: 1 })

export const OwnerApplicationModel = model('OwnerApplication', ownerApplicationSchema)
