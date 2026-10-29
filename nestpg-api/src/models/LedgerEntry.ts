import { Schema, model } from 'mongoose'

const ledgerEntrySchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', index: true },
    entryType: { type: String, enum: ['income', 'expense'], required: true, index: true },
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    entryDate: { type: Date, required: true, index: true },
    notes: { type: String, default: '' },
    residentName: { type: String, default: '' },
    residentId: { type: Schema.Types.ObjectId, ref: 'Resident' },
    source: { type: String, enum: ['individual', 'bulk'], default: 'individual' },
    sheetId: { type: Schema.Types.ObjectId, ref: 'BalanceSheet' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
)

ledgerEntrySchema.index({ ownerId: 1, pgId: 1, entryDate: -1 })

export const LedgerEntryModel = model('LedgerEntry', ledgerEntrySchema)
