import { Schema, model } from 'mongoose'

const categoryTotalSchema = new Schema(
  {
    category: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const balanceSheetSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', index: true },
    title: { type: String, required: true },
    periodStart: { type: Date, required: true, index: true },
    periodEnd: { type: Date, required: true, index: true },
    totalIncome: { type: Number, required: true, min: 0 },
    totalExpense: { type: Number, required: true, min: 0 },
    netBalance: { type: Number, required: true },
    entriesCount: { type: Number, required: true, min: 0 },
    incomeByCategory: { type: [categoryTotalSchema], default: [] },
    expenseByCategory: { type: [categoryTotalSchema], default: [] },
    notes: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastGeneratedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true },
)

balanceSheetSchema.index({ ownerId: 1, createdAt: -1 })

export const BalanceSheetModel = model('BalanceSheet', balanceSheetSchema)
