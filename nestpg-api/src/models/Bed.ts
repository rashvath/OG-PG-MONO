import { Schema, model } from 'mongoose'

const bedSchema = new Schema(
  {
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    bedLabel: { type: String, required: true },
    bedNumber: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['vacant', 'reserved', 'occupied', 'maintenance'],
      default: 'vacant',
    },
    monthlyRent: { type: Number, default: 0 },
    maintenanceReason: { type: String, default: '' },
    reservedForName: { type: String, default: '' },
    reservedForPhone: { type: String, default: '' },
    reservedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    reservedAt: { type: Date },
    expectedMoveInDate: { type: Date },
    expectedVacatingDate: { type: Date },
  },
  { timestamps: true },
)

bedSchema.index({ roomId: 1, bedLabel: 1 }, { unique: true })
bedSchema.index({ roomId: 1, bedNumber: 1 }, { unique: true, sparse: true })
bedSchema.index({ pgId: 1, status: 1 })

export const BedModel = model('Bed', bedSchema)
