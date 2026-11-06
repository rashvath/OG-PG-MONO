import { Schema, model } from 'mongoose'

const customRoleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    color: { type: String, default: '#6366f1' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

customRoleSchema.index({ ownerId: 1, pgId: 1 })
customRoleSchema.index({ pgId: 1, name: 1 }, { unique: true })

export const CustomRoleModel = model('CustomRole', customRoleSchema)
