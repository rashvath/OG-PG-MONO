import { Schema, model } from 'mongoose'

const attendanceSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['present', 'absent', 'half-day', 'on-leave'], required: true },
    checkIn: { type: String, trim: true },
    checkOut: { type: String, trim: true },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

attendanceSchema.index({ ownerId: 1, pgId: 1, date: -1 })
attendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true })

export const AttendanceModel = model('Attendance', attendanceSchema)
