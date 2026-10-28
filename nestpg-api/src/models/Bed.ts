import { Schema, model } from 'mongoose'

const bedSchema = new Schema(
  {
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    bedLabel: { type: String, required: true },
    status: {
      type: String,
      enum: ['available', 'reserved', 'occupied', 'maintenance', 'blocked', 'vacant', 'cleaning'],
      default: 'available',
    },
  },
  { timestamps: true },
)

bedSchema.index({ roomId: 1, bedLabel: 1 }, { unique: true })
bedSchema.index({ pgId: 1, status: 1 })

export const BedModel = model('Bed', bedSchema)
