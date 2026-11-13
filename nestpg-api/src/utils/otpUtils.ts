import { randomInt } from 'node:crypto'

import { env } from '../config/env'
import { OtpModel, type OtpPurpose } from '../models/Otp'
import { sendEmailReusable } from '../shared/email/send-email-reusable'

export class OtpDeliveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OtpDeliveryError'
  }
}

export function generateOtp(): string {
  return String(randomInt(100000, 1000000))
}

export function getOtp(): string {
  if (env.sendOtp) {
    return generateOtp()
  }
  if (!/^\d{4,8}$/.test(env.otpKeyword)) {
    throw new Error('OTP_KEYWORD must contain 4 to 8 digits when SEND_OTP is disabled')
  }
  return env.otpKeyword
}

export async function createAndSendOtp(email: string, purpose: OtpPurpose): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  await OtpModel.deleteMany({ email: normalizedEmail, purpose })

  const otp = getOtp()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  await OtpModel.create({ email: normalizedEmail, otp, purpose, expiresAt })

  if (!env.sendOtp) {
    console.log(`[DEV] OTP for ${normalizedEmail} (${purpose}): ${otp}`)
    return
  }

  const subject =
    purpose === 'registration' ? 'NestPG — Your Registration OTP' : 'NestPG — Password Reset OTP'
  const description =
    purpose === 'registration'
      ? 'Use this OTP to complete your registration:'
      : 'Use this OTP to reset your password:'
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
    <h2 style="color:#ff385c;">NestPG</h2>
    <p>${description}</p>
    <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#222;padding:24px 0;">${otp}</div>
    <p style="color:#717171;font-size:14px;">This OTP is valid for <strong>10 minutes</strong>.<br>
    If you did not request this, ignore this email.</p>
  </div>`

  const result = await sendEmailReusable(
    { to: normalizedEmail, subject, text: `${description} ${otp}. It is valid for 10 minutes.`, html },
    {
      user: env.gmailUser,
      appPassword: env.gmailAppPassword,
      ...(env.gmailFrom ? { from: env.gmailFrom } : {}),
    },
  )

  if (!result.ok) {
    await OtpModel.deleteMany({ email: normalizedEmail, purpose })
    throw new OtpDeliveryError(`Unable to send OTP email: ${result.error}`)
  }
}

export async function verifyOtp(
  email: string,
  purpose: OtpPurpose,
  otpInput: string,
): Promise<{ valid: boolean; reason?: string; otpId?: string }> {
  const record = await OtpModel.findOne({
    email: email.trim().toLowerCase(),
    purpose,
    verified: false,
  })

  if (!record) {
    return { valid: false, reason: 'No active OTP found. Request a new one.' }
  }
  if (record.expiresAt < new Date()) {
    await record.deleteOne()
    return { valid: false, reason: 'OTP has expired. Request a new one.' }
  }
  if (record.otp !== otpInput.trim()) {
    record.attempts += 1
    if (record.attempts >= 5) {
      await record.deleteOne()
      return { valid: false, reason: 'Incorrect OTP. 0 attempts remaining. Request a new OTP.' }
    }
    await record.save()
    return {
      valid: false,
      reason: `Incorrect OTP. ${5 - record.attempts} attempt(s) remaining.`,
    }
  }

  return { valid: true, otpId: record.id }
}
