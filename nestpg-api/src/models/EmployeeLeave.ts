import { Schema, model } from 'mongoose'

const employeeLeaveSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalDays: { type: Number, min: 1, required: true },
    leaveType: { type: String, enum: ['sick', 'casual', 'annual', 'unpaid', 'emergency'], required: true },
    reason: { type: String, trim: true, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedNote: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

employeeLeaveSchema.index({ ownerId: 1, pgId: 1, status: 1 })

export const EmployeeLeaveModel = model('EmployeeLeave', employeeLeaveSchema)
