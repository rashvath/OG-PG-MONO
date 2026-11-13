import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import { apiClient, toApiError } from '@/api/http'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { useToast } from '@/lib/toast'

type Step = 1 | 2 | 3

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState<Step>(1)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
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
    await apiClient.post('/auth/forgot-password', { email })
    setStep(2)
    setResendSeconds(30)
    setError('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
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
    <section className="auth-shell app-wrap">
      <aside className="auth-showcase panel">
        <p className="eyebrow">Account security</p>
        <h2>Get back to your NestPG account.</h2>
        <p className="section-sub">Verify your email address and choose a new password.</p>
      </aside>

      <form className="auth-card" onSubmit={submit}>
        <div className="auth-head">
          <h2>{step === 1 ? 'Reset your password' : step === 2 ? 'Enter your OTP' : 'Set a new password'}</h2>
          <p>
            {step === 1
              ? "We'll send an OTP to your registered email."
              : step === 2
                ? `Check your inbox for the code we sent to ${email}.`
                : 'Choose a new password with at least 8 characters.'}
          </p>
        </div>

        {step === 1 ? (
          <>
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <PasswordInput
              required
              label="One-Time Password"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))}
            />
            <button
              type="button"
              className="text-xs text-text-2 underline underline-offset-2 disabled:cursor-not-allowed disabled:no-underline"
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

        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {sessionExpired ? (
          <button type="button" className="btn btn-line" onClick={startOver}>
            Start over
          </button>
        ) : (
          <button className="btn btn-brand auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? step === 1 ? 'Sending OTP...' : step === 2 ? 'Verifying...' : 'Resetting password...'
              : step === 1 ? 'Send OTP' : step === 2 ? 'Verify OTP' : 'Reset Password'}
          </button>
        )}

        <p className="auth-switch">
          <Link to="/auth/login">← Back to Login</Link>
        </p>
      </form>
    </section>
  )
}
