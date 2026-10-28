import { Schema, model } from 'mongoose'

const roomTypeSchema = new Schema(
  {
    sharing: { type: String, enum: ['Single', 'Double', 'Triple'], required: true },
    rent: { type: Number, required: true },
    deposit: { type: Number, required: true },
  },
  { _id: false },
)

const foodMenuDaySchema = new Schema(
  {
    day: { type: String, required: true },
    items: [{ type: String }],
  },
  { _id: false },
)

const listingSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    address: { type: String, default: '' },
    area: { type: String, required: true },
    city: { type: String, default: 'Bangalore' },
    pincode: { type: String, default: '' },
    mapsLocation: { type: String, default: '' },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    description: { type: String, default: '' },
    baseRent: { type: Number, required: true },
    deposit: { type: Number, default: 0 },
    maintenance: { type: Number, default: 0 },
    electricityRules: { type: String, default: '' },
    foodCharges: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    gender: { type: String, enum: ['Men', 'Women', 'Co-ed'], required: true },
    pgType: { type: String, default: '' },
    totalFloors: { type: Number, default: 0 },
    totalRooms: { type: Number, default: 0 },
    totalBeds: { type: Number, default: 0 },
    occupiedBeds: { type: Number, default: 0 },
    availableBeds: { type: Number, default: 0 },
    foodAvailable: { type: Boolean, default: false },
    weeklyMenu: { type: [foodMenuDaySchema], default: [] },
    curfew: { type: String, default: '' },
    securityInfo: { type: String, default: '' },
    amenities: [{ type: String }],
    photos: [{ type: String }],
    contactName: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    availability: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'live', 'suspended', 'rejected', 'unassigned'],
      default: 'pending',
    },
    rating: { type: Number, default: 4 },
    reviewCount: { type: Number, default: 0 },
    roomTypes: { type: [roomTypeSchema], default: [] },
  },
  { timestamps: true },
)

listingSchema.index({ status: 1, city: 1, area: 1 })
listingSchema.index({ baseRent: 1 })

export const ListingModel = model('Listing', listingSchema)
