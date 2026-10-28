import { Schema, model } from 'mongoose'

const pgOwnerAssignmentSchema = new Schema(
  {
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, unique: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

pgOwnerAssignmentSchema.index({ ownerId: 1 })

export const PgOwnerAssignmentModel = model('PgOwnerAssignment', pgOwnerAssignmentSchema)
