import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { fetchLiveListings } from '@/api/listings-api'
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
  const [email, setEmail] = useState('customer@nestpg.com')
  const [password, setPassword] = useState('Nestpg@123')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const useDemo = (emailValue: string, passwordValue: string) => {
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
    <section className="auth-shell app-wrap">
      <aside className="auth-showcase panel">
        <p className="eyebrow">OG PG Access</p>
        <h2>Welcome back to your control desk.</h2>
        <p className="section-sub">Access admin tools, approvals, assignments, and owner dashboards from one secure login.</p>
        <div className="auth-demo-grid">
          {demoUsers.map((account) => (
            <button
              key={account.email}
              type="button"
              className="auth-demo-chip"
              onClick={() => useDemo(account.email, account.password)}
            >
              {account.label}
            </button>
          ))}
        </div>
      </aside>

      <form className="auth-card" onSubmit={submit}>
        <div className="auth-head">
          <h2>Sign in</h2>
          <p>Use your OG PG credentials.</p>
        </div>

        <label>Email</label>
        <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label>Password</label>
        <input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />

        {error ? <p className="form-error">{error}</p> : null}

        <button className="btn btn-brand auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in...' : 'Log in'}
        </button>

        <p className="auth-switch">
          New here? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </section>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const registerConfig = useFormConfig('auth.register')
  const ownerRegisterConfig = useFormConfig('auth.ownerRegistration')
  const [role, setRole] = useState<'customer' | 'owner' | 'tenant'>('customer')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    setIsSubmitting(true)
    setError('')

    try {
      await register({
        name,
        phone,
        email,
        password,
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
      navigate('/login')
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to register'
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="auth-shell app-wrap">
      <aside className="auth-showcase panel">
        <p className="eyebrow">Join OG PG</p>
        <h2>Create a customer account, apply as owner, or request tenant access.</h2>
        <p className="section-sub">
          Owner applications go to admin approval. Only approved owners can manage assigned PGs.
        </p>
      </aside>

      <form className="auth-card" onSubmit={submit}>
        <div className="auth-head">
          <h2>Create account</h2>
          <p>Start your OG PG journey.</p>
        </div>

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

        <div className="auth-input-grid two-col">
          <div>
            <label>{registerConfig.getLabel('name', 'Name')}</label>
            <input required={registerConfig.isRequired('name')} value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label>{registerConfig.getLabel('phone', 'Phone')}</label>
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

        <label>{registerConfig.getLabel('email', 'Email')}</label>
        <input required={registerConfig.isRequired('email')} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <label>{registerConfig.getLabel('password', 'Password')}</label>
        <input
          required={registerConfig.isRequired('password')}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {role === 'tenant' ? (
          <>
            <label>Select PG name</label>
            <select
              required
              value={selectedTenantPgId}
              onChange={(event) => setSelectedTenantPgId(event.target.value)}
            >
              <option value="">Select a PG</option>
              {tenantListings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {listing.name} - {listing.area}
                </option>
              ))}
            </select>
            <p className="auth-hint">Your tenant account will be activated after owner/admin approval.</p>
          </>
        ) : null}

        {role === 'owner' ? (
          <>
            <div className="auth-input-grid two-col">
              <div>
                <label>{ownerRegisterConfig.getLabel('pgName', 'PG Name')}</label>
                <input
                  required={ownerRegisterConfig.isRequired('pgName')}
                  value={pgName}
                  onChange={(event) => setPgName(event.target.value)}
                />
              </div>
              <div>
                <label>{ownerRegisterConfig.getLabel('area', 'Area')}</label>
                <input required={ownerRegisterConfig.isRequired('area')} value={area} onChange={(event) => setArea(event.target.value)} />
              </div>
            </div>
            <label>{ownerRegisterConfig.getLabel('pgAddress', 'PG Address')}</label>
            <input
              required={ownerRegisterConfig.isRequired('pgAddress')}
              value={pgAddress}
              onChange={(event) => setPgAddress(event.target.value)}
            />

            <div className="auth-input-grid two-col">
              <div>
                <label>{ownerRegisterConfig.getLabel('rooms', 'Rooms')}</label>
                <input
                  required={ownerRegisterConfig.isRequired('rooms')}
                  type="number"
                  value={toNumberValue(rooms)}
                  onChange={(event) => setRooms(parseNumberInput(event.target.value))}
                />
              </div>
              <div>
                <label>{ownerRegisterConfig.getLabel('rent', 'Monthly rent')}</label>
                <input
                  required={ownerRegisterConfig.isRequired('rent')}
                  type="number"
                  value={toNumberValue(rent)}
                  onChange={(event) => setRent(parseNumberInput(event.target.value))}
                />
              </div>
            </div>

            <label>{ownerRegisterConfig.getLabel('amenities', 'Amenities (comma separated)')}</label>
            <input
              required={ownerRegisterConfig.isRequired('amenities')}
              value={amenities}
              onChange={(event) => setAmenities(event.target.value)}
              placeholder="WiFi, Meals, Laundry"
            />
            <label>{ownerRegisterConfig.getLabel('photos', 'Photo URLs (comma separated)')}</label>
            <input
              required={ownerRegisterConfig.isRequired('photos')}
              value={photos}
              onChange={(event) => setPhotos(event.target.value)}
              placeholder="https://..."
            />
            <label>{ownerRegisterConfig.getLabel('description', 'Description')}</label>
            <textarea
              required={ownerRegisterConfig.isRequired('description')}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
            <p className="auth-hint">Your owner account remains pending until admin reviews and approves it.</p>
          </>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}

        <button className="btn btn-brand auth-submit" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account...' : role === 'owner' ? 'Submit application' : role === 'tenant' ? 'Request tenant access' : 'Create account'}
        </button>

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </section>
  )
}
