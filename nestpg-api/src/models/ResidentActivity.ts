import { Schema, model } from 'mongoose'

const residentActivitySchema = new Schema(
  {
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    activityType: { type: String, required: true },
    message: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

residentActivitySchema.index({ residentId: 1, createdAt: -1 })

export const ResidentActivityModel = model('ResidentActivity', residentActivitySchema)
