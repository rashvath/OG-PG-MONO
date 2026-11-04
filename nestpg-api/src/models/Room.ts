import { Schema, model } from 'mongoose'

const roomSchema = new Schema(
  {
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    floorId: { type: Schema.Types.ObjectId, ref: 'Floor' },
    floorNumber: { type: Number, required: true },
    floorName: { type: String, default: '' },
    roomNumber: { type: String, required: true },
    roomType: {
      type: String,
      enum: ['Single Sharing', 'Double Sharing', 'Triple Sharing', 'Four Sharing', 'Custom'],
      default: 'Double Sharing',
    },
    totalBeds: { type: Number, required: true },
    occupiedBeds: { type: Number, default: 0 },
    monthlyRent: { type: Number, default: 0 },
    bathroomType: { type: String, enum: ['attached', 'common'], default: 'common' },
    acType: { type: String, enum: ['ac', 'non-ac'], default: 'non-ac' },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'maintenance', 'inactive'], default: 'active' },
    customOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
)

roomSchema.index({ pgId: 1, roomNumber: 1 }, { unique: true })
roomSchema.index({ pgId: 1, floorId: 1 })

export const RoomModel = model('Room', roomSchema)
