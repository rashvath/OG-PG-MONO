import { model, Schema } from 'mongoose'

export type OtpPurpose = 'forgot-password' | 'registration'

export interface IOtp {
  email: string
  otp: string
  purpose: OtpPurpose
  expiresAt: Date
  verified: boolean
  attempts: number
}

const otpSchema = new Schema<IOtp>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    otp: { type: String, required: true },
    purpose: { type: String, enum: ['forgot-password', 'registration'], required: true },
    expiresAt: { type: Date, required: true },
    verified: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true },
)

otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
otpSchema.index({ email: 1, purpose: 1 })

export const OtpModel = model<IOtp>('Otp', otpSchema)
