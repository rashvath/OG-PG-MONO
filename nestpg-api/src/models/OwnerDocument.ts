import { Schema, model } from 'mongoose'

const ownerDocumentSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    title: { type: String, required: true, trim: true },
    documentType: { type: String, required: true, trim: true, default: 'General' },
    imageUrl: { type: String, required: true, trim: true },
    notes: { type: String, trim: true, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
)

ownerDocumentSchema.index({ ownerId: 1, pgId: 1, createdAt: -1 })

export const OwnerDocumentModel = model('OwnerDocument', ownerDocumentSchema)
