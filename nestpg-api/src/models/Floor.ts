import { Schema, model } from 'mongoose'

const floorSchema = new Schema(
  {
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    name: { type: String, required: true, trim: true },
    level: { type: Number, required: true },
    sortOrder: { type: Number, default: 0 },
    layoutMode: { type: String, enum: ['grid', 'custom'], default: 'grid' },
    gridColumns: { type: Number, default: 6 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

floorSchema.index({ pgId: 1, level: 1 }, { unique: true })
floorSchema.index({ pgId: 1, name: 1 }, { unique: true })

export const FloorModel = model('Floor', floorSchema)
