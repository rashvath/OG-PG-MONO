import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { fetchLiveListings } from '@/api/listings-api'
import { apiClient, toApiError } from '@/api/http'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { OtpInput } from '@/components/ui/OtpInput'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Select } from '@/components/ui/Select'
import { useFormConfig } from '@/hooks/use-form-config'
import { useAuth } from '@/lib/auth'
import { useToast } from '@/lib/toast'

const demoUsers = [
  { label: 'Customer', email: 'customer@nestpg.com', password: 'Nestpg@123' },
  { label: 'Owner', email: 'owner@nestpg.com', password: 'Nestpg@123' },
  { label: 'Admin', email: 'admin@nestpg.com', password: 'Nestpg@123' },
]

export function LoginPage() {
  const { login } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const loginConfig = useFormConfig('auth.login')
  const [email, setEmail] = useState('customer@nestpg.com')
  const [password, setPassword] = useState('Nestpg@123')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectDemoAccount = (emailValue: string, passwordValue: string) => {
    setEmail(emailValue)
    setPassword(passwordValue)
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const user = await login(email, password)
      toast.success(`Welcome back, ${user.name}`)
      navigate(
        user.role === 'owner'
          ? '/owner'
          : user.role === 'admin'
            ? '/admin'
            : user.role === 'tenant'
              ? '/tenant'
              : '/listings',
      )
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to log in'
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-heading">
          <h1>Sign in</h1>
          <p>Welcome back. Enter your credentials to continue.</p>
        </div>

        <Input
          label={loginConfig.getLabel('email', 'Email address')}
          required={loginConfig.isRequired('email')}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <PasswordInput
          required={loginConfig.isRequired('password')}
          label={loginConfig.getLabel('password', 'Password')}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <div className="auth-forgot-link">
          <Link to="/auth/forgot-password">
            Forgot password?
          </Link>
        </div>

        {error ? <p className="auth-error" role="alert">⚠ {error}</p> : null}

        <Button type="submit" variant="brand" className="auth-action" loading={isSubmitting}>
          Sign in
        </Button>

        <p className="auth-switch">
          Don&apos;t have an account? <Link to="/auth/register">Register</Link>
        </p>
      </form>
      <div className="auth-demo-grid">
        {demoUsers.map((account) => (
          <button
            key={account.email}
            type="button"
            className="auth-demo-chip"
            onClick={() => selectDemoAccount(account.email, account.password)}
          >
            Use demo {account.label} account
          </button>
        ))}
      </div>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const registerConfig = useFormConfig('auth.register')
  const tenantRegisterConfig = useFormConfig('auth.tenantRegistration')
  const ownerRegisterConfig = useFormConfig('auth.ownerRegistration')
  const [role, setRole] = useState<'customer' | 'owner' | 'tenant'>('customer')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [pgName, setPgName] = useState('')
  const [pgAddress, setPgAddress] = useState('')
  const [area, setArea] = useState('')
  const [rooms, setRooms] = useState(0)
  const [rent, setRent] = useState(0)
  const [amenities, setAmenities] = useState('')
  const [photos, setPhotos] = useState('')
  const [description, setDescription] = useState('')
  const [tenantListings, setTenantListings] = useState<Array<{ id: string; name: string; area: string }>>([])
  const [selectedTenantPgId, setSelectedTenantPgId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<1 | 2>(1)
  const [resendSeconds, setResendSeconds] = useState(0)
  const [otpLength, setOtpLength] = useState(4)
  const requiredMark = (required: boolean) => (required ? <span className="required-mark"> *</span> : null)

  useEffect(() => {
    if (resendSeconds === 0) {
      return
    }

    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds])

  useEffect(() => {
    fetchLiveListings()
      .then((items) => {
        setTenantListings(items.map((item) => ({ id: item.id, name: item.name, area: item.area })))
      })
      .catch(() => {
        setTenantListings([])
      })
  }, [])

  const toNumberValue = (value: number) => (value === 0 ? '' : String(value))
  const parseNumberInput = (value: string) => {
    if (value.trim() === '') {
      return 0
    }
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (step === 1 && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (step === 2 && otpCode.length !== otpLength) {
      setError(`Enter all ${otpLength} OTP digits`)
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      if (step === 1) {
        const { data } = await apiClient.post<{ otpLength?: number }>('/auth/send-registration-otp', { email })
        setOtpLength(data.otpLength ?? 4)
        setStep(2)
        setResendSeconds(30)
        return
      }

      await register({
        name,
        phone,
        email,
        password,
        otpCode,
        role,
        ...(role === 'tenant' ? { pgId: selectedTenantPgId } : {}),
        ...(role === 'owner'
          ? {
              pgName,
              pgAddress,
              area,
              description,
              numberOfRooms: rooms,
              photos: photos
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
              rent,
              amenities: amenities
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            }
          : {}),
      })
      toast.success(
        role === 'owner'
          ? 'Application submitted. Wait for admin approval before owner login.'
          : role === 'tenant'
            ? 'Tenant request submitted. Wait for owner/admin approval before login.'
            : 'Account created successfully. Please log in.',
      )
      navigate('/auth/login')
    } catch (requestError) {
      const message = toApiError(requestError, 'Unable to register')
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-progress" aria-label={`Step ${step} of 2`}>
          <span className="active" />
          <span className={step === 2 ? 'active' : ''} />
        </div>
        <div className="auth-heading">
          <h1>{step === 1 ? 'Create account' : 'Verify your email'}</h1>
          <p>{step === 1 ? 'Enter your details to continue.' : <>We sent a code to <strong>{email}</strong></>}</p>
        </div>

        {step === 1 ? (
          <>
        <label>Register as</label>
        <div className="auth-role-switch">
          <button
            type="button"
            className={`auth-role-btn ${role === 'customer' ? 'active' : ''}`}
            onClick={() => setRole('customer')}
          >
            Customer
          </button>
          <button
            type="button"
            className={`auth-role-btn ${role === 'owner' ? 'active' : ''}`}
            onClick={() => setRole('owner')}
          >
            PG Owner
          </button>
          <button
            type="button"
            className={`auth-role-btn ${role === 'tenant' ? 'active' : ''}`}
            onClick={() => setRole('tenant')}
          >
            Tenant
          </button>
        </div>

        <div className="auth-fields-grid">
          <div>
            <label>
              {registerConfig.getLabel('name', 'Name')}
              {requiredMark(registerConfig.isRequired('name'))}
            </label>
            <input required={registerConfig.isRequired('name')} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label>
              {registerConfig.getLabel('phone', 'Phone')}
              {requiredMark(registerConfig.isRequired('phone'))}
            </label>
            <input
              required={registerConfig.isRequired('phone')}
              value={phone}
              maxLength={10}
              inputMode="numeric"
              pattern="[0-9]{10}"
              onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
            />
          </div>
        </div>

        <Input label={registerConfig.getLabel('email', 'Email')} required={registerConfig.isRequired('email')} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <PasswordInput
          required={registerConfig.isRequired('password')}
          label={registerConfig.getLabel('password', 'Password')}
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordInput
          required={registerConfig.isRequired('confirmPassword')}
          label={registerConfig.getLabel('confirmPassword', 'Confirm password')}
          autoComplete="new-password"
          minLength={6}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />

        {role === 'tenant' ? (
          <>
            <Select
              label={tenantRegisterConfig.getLabel('pgId', 'Select PG name')}
              required={tenantRegisterConfig.isRequired('pgId')}
              value={selectedTenantPgId}
              onChange={(event) => setSelectedTenantPgId(event.target.value)}
            >
              <option value="">Select a PG</option>
              {tenantListings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.name} - {listing.area}
                </option>
              ))}
            </Select>
            <p className="auth-hint">Your tenant account will be activated after owner/admin approval.</p>
          </>
        ) : null}

        {role === 'owner' ? (
          <>
            <div className="auth-fields-grid">
              <div>
                <label>
                  {ownerRegisterConfig.getLabel('pgName', 'PG Name')}
                  {requiredMark(ownerRegisterConfig.isRequired('pgName'))}
                </label>
                <input
                  required={ownerRegisterConfig.isRequired('pgName')}
                  value={pgName}
                  onChange={(event) => setPgName(event.target.value)}
                />
              </div>
              <div>
                <label>
                  {ownerRegisterConfig.getLabel('area', 'Area')}
                  {requiredMark(ownerRegisterConfig.isRequired('area'))}
                </label>
                <input required={ownerRegisterConfig.isRequired('area')} value={area} onChange={(event) => setArea(event.target.value)} />
              </div>
            </div>
            <label>
              {ownerRegisterConfig.getLabel('pgAddress', 'PG Address')}
              {requiredMark(ownerRegisterConfig.isRequired('pgAddress'))}
            </label>
            <input
              required={ownerRegisterConfig.isRequired('pgAddress')}
              value={pgAddress}
              onChange={(event) => setPgAddress(event.target.value)}
            />

            <div className="auth-fields-grid">
              <div>
                <label>
                  {ownerRegisterConfig.getLabel('rooms', 'Rooms')}
                  {requiredMark(ownerRegisterConfig.isRequired('rooms'))}
                </label>
                <input
                  required={ownerRegisterConfig.isRequired('rooms')}
                  type="number"
                  value={toNumberValue(rooms)}
                  onChange={(event) => setRooms(parseNumberInput(event.target.value))}
                />
              </div>
              <div>
                <label>
                  {ownerRegisterConfig.getLabel('rent', 'Monthly rent')}
                  {requiredMark(ownerRegisterConfig.isRequired('rent'))}
                </label>
                <input
                  required={ownerRegisterConfig.isRequired('rent')}
                  type="number"
                  value={toNumberValue(rent)}
                  onChange={(event) => setRent(parseNumberInput(event.target.value))}
                />
              </div>
            </div>

            <label>
              {ownerRegisterConfig.getLabel('amenities', 'Amenities (comma separated)')}
              {requiredMark(ownerRegisterConfig.isRequired('amenities'))}
            </label>
            <input
              required={ownerRegisterConfig.isRequired('amenities')}
              value={amenities}
              onChange={(event) => setAmenities(event.target.value)}
              placeholder="WiFi, Meals, Laundry"
            />
            <label>
              {ownerRegisterConfig.getLabel('photos', 'Photo URLs (comma separated)')}
              {requiredMark(ownerRegisterConfig.isRequired('photos'))}
            </label>
            <input
              required={ownerRegisterConfig.isRequired('photos')}
              value={photos}
              onChange={(event) => setPhotos(event.target.value)}
              placeholder="https://..."
            />
            <label>
              {ownerRegisterConfig.getLabel('description', 'Description')}
              {requiredMark(ownerRegisterConfig.isRequired('description'))}
            </label>
            <textarea
              required={ownerRegisterConfig.isRequired('description')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
            <p className="auth-hint">Your owner account remains pending until admin reviews and approves it.</p>
          </>
        ) : null}
          </>
        ) : (
          <>
            <OtpInput
              value={otpCode}
              onChange={setOtpCode}
              length={otpLength}
              error={error && otpCode.length !== otpLength ? error : undefined}
              label="Enter your OTP"
              disabled={isSubmitting}
            />
            <div className="auth-step-actions">
              <button
                type="button"
                className="auth-inline-action"
                disabled={resendSeconds > 0 || isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true)
                  setError('')
                  try {
                    await apiClient.post('/auth/send-registration-otp', { email })
                    setResendSeconds(30)
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
              <button type="button" className="auth-inline-action" onClick={() => setStep(1)}>
                Back to account details
              </button>
              <Link to="/auth/login" className="auth-inline-action">
                Back to login
              </Link>
            </div>
          </>
        )}

        {error && !(step === 2 && otpCode.length !== otpLength) ? <p className="auth-error" role="alert">⚠ {error}</p> : null}

        <Button type="submit" variant="brand" className="auth-action" loading={isSubmitting}>
          {step === 1 ? 'Continue' : 'Verify & Create Account'}
        </Button>

        <p className="auth-switch">
          Already registered? <Link to="/auth/login">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  )
}
