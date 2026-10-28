import { Schema, model } from 'mongoose'

const enquirySchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    moveInDate: { type: Date },
    status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
  },
  { timestamps: true },
)

enquirySchema.index({ ownerId: 1, createdAt: -1 })
enquirySchema.index({ listingId: 1, createdAt: -1 })

export const EnquiryModel = model('Enquiry', enquirySchema)
