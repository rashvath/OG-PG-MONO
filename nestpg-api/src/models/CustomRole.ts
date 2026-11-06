import { Schema, Types, model } from 'mongoose'

type CustomRole = {
  name: string
  pgId: Types.ObjectId
  ownerId: Types.ObjectId
  color: string
  createdBy: Types.ObjectId
}

const customRoleSchema = new Schema<CustomRole>(
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

export const CustomRoleModel = model<CustomRole>('CustomRole', customRoleSchema)
