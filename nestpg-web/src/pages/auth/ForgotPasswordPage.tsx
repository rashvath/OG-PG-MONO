import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import { apiClient, toApiError } from '@/api/http'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Input } from '@/components/ui/Input'
import { OtpInput } from '@/components/ui/OtpInput'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useToast } from '@/lib/toast'

type Step = 1 | 2 | 3

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState<Step>(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [otpLength, setOtpLength] = useState(4)
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resendSeconds, setResendSeconds] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    if (resendSeconds === 0) {
      return
    }

    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds])

  const requestOtp = async () => {
    const { data } = await apiClient.post<{ otpLength?: number }>('/auth/forgot-password', { email })
    setOtpLength(data.otpLength ?? 4)
    setStep(2)
    setResendSeconds(30)
    setError('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (step === 2 && otp.length !== otpLength) {
      setError(`Enter all ${otpLength} OTP digits`)
      return
    }
    setIsSubmitting(true)
    setError('')

    try {
      if (step === 1) {
        await requestOtp()
      } else if (step === 2) {
        const { data } = await apiClient.post<{ resetToken: string }>('/auth/verify-reset-otp', { email, otp })
        setResetToken(data.resetToken)
        setStep(3)
      } else {
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match')
          return
        }
        await apiClient.post('/auth/reset-password', { resetToken, newPassword })
        toast.success('Password reset successfully. Please log in.')
        window.setTimeout(() => navigate('/auth/login'), 2000)
      }
    } catch (requestError) {
      const message = toApiError(requestError, 'Request failed')
      if (step === 3 && axios.isAxiosError(requestError) && requestError.response?.status === 400) {
        setSessionExpired(true)
        setError('Session expired. Start over.')
      } else {
        setError(message)
        toast.error(message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const startOver = () => {
    setStep(1)
    setOtp('')
    setResetToken('')
    setNewPassword('')
    setConfirmPassword('')
    setSessionExpired(false)
    setError('')
  }

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-heading">
          <h1>{step === 1 ? 'Reset your password' : step === 2 ? 'Enter your code' : 'Set new password'}</h1>
          <p>
            {step === 1
              ? "Enter your registered email and we'll send you a code."
              : step === 2
                ? <>We sent a {otpLength}-digit code to <strong>{email}</strong></>
                : 'Choose a strong password for your account.'}
          </p>
        </div>

        {step === 1 ? (
          <Input
            id="reset-email"
            label="Email address"
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        ) : null}

        {step === 2 ? (
          <>
            <OtpInput
              length={otpLength}
              value={otp}
              onChange={setOtp}
              error={error && otp.length !== otpLength ? error : undefined}
              label="Enter your OTP"
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="auth-inline-action"
              disabled={resendSeconds > 0 || isSubmitting}
              onClick={async () => {
                setIsSubmitting(true)
                setError('')
                try {
                  await requestOtp()
                } catch (requestError) {
                  const message = toApiError(requestError, 'Unable to resend OTP')
                  setError(message)
                  toast.error(message)
                } finally {
                  setIsSubmitting(false)
                }
              }}
            >
              {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : 'Resend OTP'}
            </button>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <PasswordInput
              required
              label="New Password"
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
            <PasswordInput
              required
              label="Confirm New Password"
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </>
        ) : null}

        {error && !(step === 2 && otp.length !== otpLength) ? <p className="auth-error" role="alert">⚠ {error}</p> : null}
        {sessionExpired ? (
          <button type="button" className="auth-action auth-action-secondary" onClick={startOver}>
            Start over
          </button>
        ) : (
          <button className="btn btn-brand auth-action" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : step === 1 ? 'Send OTP' : step === 2 ? 'Verify Code' : 'Reset Password'}
          </button>
        )}

        <p className="auth-switch">
          <Link to="/auth/login">← Back to Login</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
