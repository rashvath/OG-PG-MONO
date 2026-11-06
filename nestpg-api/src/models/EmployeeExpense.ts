import { Schema, model } from 'mongoose'

const employeeExpenseSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['food', 'supplies', 'maintenance', 'travel', 'utilities', 'other'],
      default: 'other',
    },
    expenseDate: { type: Date, required: true },
    receiptUrl: { type: String, trim: true },
    paidBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

employeeExpenseSchema.index({ ownerId: 1, pgId: 1, expenseDate: -1 })

export const EmployeeExpenseModel = model('EmployeeExpense', employeeExpenseSchema)
