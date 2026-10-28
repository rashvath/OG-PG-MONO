import { Schema, model } from 'mongoose'

const residentSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pgId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
    bedId: { type: Schema.Types.ObjectId, ref: 'Bed', required: true },

    fullName: { type: String, required: true },
    profilePhoto: { type: String, default: '' },
    phone: { type: String, required: true },
    email: { type: String, default: '' },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Other' },

    emergencyContact: { type: String, default: '' },
    emergencyPhone: { type: String, default: '' },
    idType: { type: String, default: '' },
    idVerified: { type: Boolean, default: false },
    address: { type: String, default: '' },
    occupation: { type: String, default: '' },
    organization: { type: String, default: '' },

    joiningDate: { type: Date, required: true },
    expectedExitDate: { type: Date },
    actualExitDate: { type: Date },

    rent: { type: Number, default: 0 },
    deposit: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    amountDue: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },

    status: {
      type: String,
      enum: ['invited', 'pending_verification', 'active', 'notice_period', 'left', 'suspended'],
      default: 'active',
    },

    leavingReason: { type: String, default: '' },
    finalPaymentStatus: { type: String, default: '' },
    depositSettlement: { type: String, default: '' },
    finalSettlementAmount: { type: Number, default: 0 },
    finalSettlementPaid: { type: Boolean, default: false },
    finalSettlementPaidAt: { type: Date },
    finalRoomCondition: { type: String, default: '' },
    exitNotes: { type: String, default: '' },
  },
  { timestamps: true },
)

residentSchema.index({ ownerId: 1, status: 1 })
residentSchema.index({ pgId: 1, roomId: 1, bedId: 1 })

export const ResidentModel = model('Resident', residentSchema)
