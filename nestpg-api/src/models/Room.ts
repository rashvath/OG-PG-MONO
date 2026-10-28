import { Schema, model } from 'mongoose'

const roomSchema = new Schema(
  {
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    floorNumber: { type: Number, required: true },
    roomNumber: { type: String, required: true },
    totalBeds: { type: Number, required: true },
    occupiedBeds: { type: Number, default: 0 },
  },
  { timestamps: true },
)

roomSchema.index({ pgId: 1, floorNumber: 1, roomNumber: 1 }, { unique: true })

export const RoomModel = model('Room', roomSchema)
