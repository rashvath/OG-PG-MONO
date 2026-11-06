import { Schema, Types, model } from 'mongoose'

type SalaryPayment = {
  employeeId: Types.ObjectId
  pgId: Types.ObjectId
  ownerId: Types.ObjectId
  month: number
  year: number
  baseSalary: number
  deductions: number
  bonuses: number
  netPaid: number
  paidAt: Date
  paymentMode: 'cash' | 'upi' | 'bank'
  notes: string
}

const salaryPaymentSchema = new Schema<SalaryPayment>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: Number, min: 1, max: 12, required: true },
    year: { type: Number, required: true },
    baseSalary: { type: Number, required: true, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    bonuses: { type: Number, default: 0, min: 0 },
    netPaid: { type: Number, required: true, min: 0 },
    paidAt: { type: Date, required: true },
    paymentMode: { type: String, enum: ['cash', 'upi', 'bank'], default: 'cash' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

salaryPaymentSchema.index({ ownerId: 1, pgId: 1 })
salaryPaymentSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true })

export const SalaryPaymentModel = model<SalaryPayment>('SalaryPayment', salaryPaymentSchema)
