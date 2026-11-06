import { Schema, model } from 'mongoose'

const emergencyContactSchema = new Schema(
  {
    name: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
  },
  { _id: false },
)

const employeeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roleId: { type: Schema.Types.ObjectId, ref: 'CustomRole', required: true },
    monthlySalary: { type: Number, required: true, min: 0 },
    joiningDate: { type: Date, required: true },
    status: { type: String, enum: ['active', 'inactive', 'resigned'], default: 'active' },
    address: { type: String, trim: true, default: '' },
    emergencyContact: { type: emergencyContactSchema, default: () => ({}) },
    profilePhoto: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

employeeSchema.index({ ownerId: 1, pgId: 1, status: 1 })

export const EmployeeModel = model('Employee', employeeSchema)
