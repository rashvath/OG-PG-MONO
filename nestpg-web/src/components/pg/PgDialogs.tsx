import { useEffect, useMemo, useState, type WheelEvent } from 'react'
import axios from 'axios'
import { X } from 'lucide-react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

import { CustomDropdown } from '@/components/ui/CustomDropdown'
import { AMENITIES, AREAS } from '@/lib/mock-data'
import { uploadPgImages } from '@/api/upload-api'

const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946]
const BENGALURU_BOUNDS = {
  minLat: 12.7343,
  maxLat: 13.1737,
  minLng: 77.4089,
  maxLng: 77.7821,
}

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

type Gender = 'Men' | 'Women' | 'Co-ed'
type FormRole = 'admin' | 'owner'

export type PgFormValues = {
  name: string
  area: string
  address: string
  pincode: string
  description: string
  baseRent: number
  deposit: number
  maintenance: number
  foodCharges: number
  otherCharges: number
  electricityRules: string
  totalRooms: number
  totalBeds: number
  pgType: string
  totalFloors: number
  gender: Gender
  foodAvailable: boolean
  weeklyMenu: Array<{ day: string; items: string[] }>
  curfew: string
  securityInfo: string
  contactName: string
  contactPhone: string
  amenities: string[]
  photos: string[]
  mapsLocation: string
  latitude: number | null
  longitude: number | null
}

type PgFormDialogProps = {
  open: boolean
  role: FormRole
  mode: 'create' | 'edit'
  title: string
  submitLabel: string
  initialValues?: Partial<PgFormValues>
  pendingFields?: Array<keyof PgFormValues>
  isSubmitting?: boolean
  onClose: () => void
  onSubmit: (values: PgFormValues) => Promise<void> | void
}

const ADMIN_REQUIRED_FIELDS: Array<keyof PgFormValues> = ['name', 'baseRent', 'gender', 'contactName', 'mapsLocation']
const OWNER_REQUIRED_FIELDS: Array<keyof PgFormValues> = [
  'name',
  'area',
  'address',
  'baseRent',
  'gender',
  'contactName',
  'contactPhone',
  'mapsLocation',
  'weeklyMenu',
]

const DAYS: readonly string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const FIELD_LABELS: Record<keyof PgFormValues, string> = {
  name: 'PG name',
  area: 'Area',
  address: 'Address',
  pincode: 'Pincode',
  description: 'Description',
  baseRent: 'Starting rent',
  deposit: 'Deposit',
  maintenance: 'Maintenance',
  foodCharges: 'Food charges',
  otherCharges: 'Other charges',
  electricityRules: 'Electricity rules',
  totalRooms: 'Total rooms',
  totalBeds: 'Total capacity (beds)',
  pgType: 'PG type',
  totalFloors: 'Total floors',
  gender: 'Gender',
  foodAvailable: 'Food available',
  weeklyMenu: '7-day menu (flexible)',
  curfew: 'Curfew timing',
  securityInfo: 'Security information',
  contactName: 'Contact person name',
  contactPhone: 'Contact phone',
  amenities: 'Amenities',
  photos: 'Images (optional)',
  mapsLocation: 'Location from map',
  latitude: 'Latitude',
  longitude: 'Longitude',
}

type LocationPickerProps = {
  value: [number, number] | null
  onChange: (next: [number, number]) => void
  onOutOfBounds: () => void
}

function parseCoordinatesFromMapUrl(mapsLocation: string): [number, number] | null {
  const match = mapsLocation.match(/q=\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i)
  if (!match) {
    return null
  }

  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return [lat, lng]
}

function isWithinBengaluru(coords: [number, number]) {
  const [lat, lng] = coords
  return (
    lat >= BENGALURU_BOUNDS.minLat &&
    lat <= BENGALURU_BOUNDS.maxLat &&
    lng >= BENGALURU_BOUNDS.minLng &&
    lng <= BENGALURU_BOUNDS.maxLng
  )
}

function toMapUrl(coords: [number, number]) {
  const lat = coords[0].toFixed(6)
  const lng = coords[1].toFixed(6)
  return `https://www.google.com/maps?q=${lat},${lng}`
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function extractImageUrls(rawText: string) {
  const normalized = rawText.replace(/[\r\n]+/g, ' ').trim()
  if (!normalized) {
    return [] as string[]
  }

  const urls = Array.from(normalized.matchAll(/https?:\/\/.*?(?=https?:\/\/|[\s,]|$)/gi), (match) =>
    match[0].trim().replace(/^['"(]+|['")]+$/g, ''),
  )

  return urls
}

function sanitizeImageUrls(urls: string[]) {
  return Array.from(
    new Set(
      urls
        .map((item) => item.trim())
        .filter((item) => Boolean(item) && isValidHttpUrl(item)),
    ),
  )
}

function normalizeAreaName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function mapCandidatesToKnownArea(candidates: string[]) {
  const normalizedCandidates = candidates.map(normalizeAreaName)

  for (const area of AREAS) {
    const normalizedArea = normalizeAreaName(area)
    if (normalizedCandidates.some((candidate) => candidate.includes(normalizedArea) || normalizedArea.includes(candidate))) {
      return area
    }
  }

  return null
}

function toDisplayAreaName(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ')
}

async function resolveAreaFromCoordinates(coords: [number, number]) {
  try {
    const { data } = await axios.get<{
      address?: Record<string, string | undefined>
      display_name?: string
    }>('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'jsonv2',
        lat: coords[0],
        lon: coords[1],
        addressdetails: 1,
      },
    })

    const address = data.address ?? {}
    const cityTokens = [address.city, address.town, address.county, address.state_district]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    if (!cityTokens.includes('bangalore') && !cityTokens.includes('bengaluru')) {
      return null
    }

    const candidates = [
      address.suburb,
      address.neighbourhood,
      address.city_district,
      address.quarter,
      address.village,
      ...(data.display_name ? data.display_name.split(',').map((part) => part.trim()) : []),
    ].filter((value): value is string => Boolean(value && value.trim()))

    const mappedKnownArea = mapCandidatesToKnownArea(candidates)
    if (mappedKnownArea) {
      return mappedKnownArea
    }

    const firstCandidate = candidates[0]
    if (firstCandidate) {
      return toDisplayAreaName(firstCandidate)
    }

    return null
  } catch {
    return null
  }
}

function LocationClickLayer({ value, onChange, onOutOfBounds }: LocationPickerProps) {
  useMapEvents({
    click(event) {
      const next: [number, number] = [event.latlng.lat, event.latlng.lng]
      if (!isWithinBengaluru(next)) {
        onOutOfBounds()
        return
      }
      onChange(next)
    },
  })

  return value ? <Marker position={value} icon={markerIcon} /> : null
}

function LocationPicker({ value, onChange, onOutOfBounds }: LocationPickerProps) {
  const maxBounds: L.LatLngBoundsExpression = [
    [BENGALURU_BOUNDS.minLat, BENGALURU_BOUNDS.minLng],
    [BENGALURU_BOUNDS.maxLat, BENGALURU_BOUNDS.maxLng],
  ]

  return (
    <MapContainer
      center={BENGALURU_CENTER}
      zoom={12}
      scrollWheelZoom
      className="pg-map"
      maxBounds={maxBounds}
      maxBoundsViscosity={1}
      minZoom={11}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationClickLayer value={value} onChange={onChange} onOutOfBounds={onOutOfBounds} />
    </MapContainer>
  )
}

function normalizeInitial(input?: Partial<PgFormValues>): PgFormValues {
  return {
    name: input?.name ?? '',
    area: input?.area ?? AREAS[0],
    address: input?.address ?? '',
    pincode: input?.pincode ?? '',
    description: input?.description ?? '',
    baseRent: input?.baseRent ?? 9000,
    deposit: input?.deposit ?? 0,
    maintenance: input?.maintenance ?? 0,
    foodCharges: input?.foodCharges ?? 0,
    otherCharges: input?.otherCharges ?? 0,
    electricityRules: input?.electricityRules ?? '',
    totalRooms: input?.totalRooms ?? 0,
    totalBeds: input?.totalBeds ?? 0,
    pgType: input?.pgType ?? '',
    totalFloors: input?.totalFloors ?? 0,
    gender: input?.gender ?? 'Men',
    foodAvailable: input?.foodAvailable ?? false,
    weeklyMenu: input?.weeklyMenu ?? [],
    curfew: input?.curfew ?? '',
    securityInfo: input?.securityInfo ?? '',
    contactName: input?.contactName ?? '',
    contactPhone: input?.contactPhone ?? '',
    amenities: input?.amenities ?? [],
    photos: input?.photos ?? [],
    mapsLocation: input?.mapsLocation ?? '',
    latitude: input?.latitude ?? null,
    longitude: input?.longitude ?? null,
  }
}

function serializeWeeklyMenu(menu: Array<{ day: string; items: string[] }>) {
  return menu.map((entry) => `${entry.day}: ${entry.items.join(', ')}`).join('\n')
}

function parseWeeklyMenuText(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [dayPart, itemsPart] = line.split(':')
      const day = (dayPart ?? '').trim()
      const items = (itemsPart ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      return { day, items }
    })
    .filter((entry) => entry.day && entry.items.length > 0)
    .slice(0, 7)
}

export function PgFormDialog({
  open,
  role,
  mode,
  title,
  submitLabel,
  initialValues,
  pendingFields,
  isSubmitting,
  onClose,
  onSubmit,
}: PgFormDialogProps) {
  const [form, setForm] = useState<PgFormValues>(() => normalizeInitial(initialValues))
  const [imageUrlsText, setImageUrlsText] = useState('')
  const [weeklyMenuText, setWeeklyMenuText] = useState('')
  const [mapCoords, setMapCoords] = useState<[number, number] | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [isResolvingArea, setIsResolvingArea] = useState(false)
  const [areaResolveNote, setAreaResolveNote] = useState('')
  const [detectedArea, setDetectedArea] = useState('')
  const [locationError, setLocationError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof PgFormValues, string>>>({})
  const [isAreaManuallyEditable, setIsAreaManuallyEditable] = useState(false)

  const toNumberValue = (value: number) => (value === 0 ? '' : String(value))
  const parseNumberInput = (value: string, nonNegative = true) => {
    if (value.trim() === '') {
      return 0
    }
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) {
      return 0
    }
    if (nonNegative && parsed < 0) {
      return 0
    }
    return parsed
  }
  const preventWheelValueChange = (event: WheelEvent<HTMLInputElement>) => {
    event.currentTarget.blur()
  }

  const requiredFields = useMemo(
    () => new Set<keyof PgFormValues>(role === 'admin' ? ADMIN_REQUIRED_FIELDS : OWNER_REQUIRED_FIELDS),
    [role],
  )

  const isMissingRequired = (field: keyof PgFormValues) => {
    const value = form[field]
    if (typeof value === 'string') {
      return value.trim().length === 0
    }
    if (typeof value === 'number') {
      return !Number.isFinite(value) || value <= 0
    }
    if (Array.isArray(value)) {
      return value.length === 0
    }
    if (typeof value === 'boolean') {
      return false
    }
    return value == null
  }

  useEffect(() => {
    if (!open) {
      return
    }

    const next = normalizeInitial(initialValues)
    setForm(next)
    setImageUrlsText(next.photos.join('\n'))
    setWeeklyMenuText(serializeWeeklyMenu(next.weeklyMenu))
    const parsedCoords = parseCoordinatesFromMapUrl(next.mapsLocation)
    setMapCoords(parsedCoords && isWithinBengaluru(parsedCoords) ? parsedCoords : null)
    setSelectedFiles([])
    setUploadError('')
    setIsResolvingArea(false)
    setAreaResolveNote('')
    setDetectedArea('')
    setLocationError('')
    setFieldErrors({})
    setIsAreaManuallyEditable(false)
  }, [initialValues, open])

  const areaOptions = useMemo(() => {
    const values = new Set<string>(AREAS)
    const currentArea = form.area.trim()
    const resolvedArea = detectedArea.trim()

    if (currentArea) {
      values.add(currentArea)
    }
    if (resolvedArea) {
      values.add(resolvedArea)
    }

    return Array.from(values).map((value) => ({ label: value, value }))
  }, [detectedArea, form.area])

  const selectedAmenitiesCount = form.amenities.length

  const mapHint = useMemo(() => {
    if (!mapCoords) {
      return 'Click on map to select exact PG location.'
    }
    return `Selected: ${mapCoords[0].toFixed(6)}, ${mapCoords[1].toFixed(6)}`
  }, [mapCoords])

  const pendingFieldSet = useMemo(() => new Set(pendingFields ?? []), [pendingFields])

  const hasPendingGap = (field: keyof PgFormValues) => {
    if (!pendingFieldSet.has(field)) {
      return false
    }
    if (field === 'weeklyMenu') {
      return parseWeeklyMenuText(weeklyMenuText).length < 7
    }
    return isMissingRequired(field)
  }

  const getFieldClassName = (field: keyof PgFormValues) =>
    `form-field ${hasPendingGap(field) ? 'pending-field' : ''}`.trim()

  const showPendingNote = (field: keyof PgFormValues) =>
    hasPendingGap(field) ? <small className="pending-field-note">Required to complete profile</small> : null

  if (!open) {
    return null
  }

  const setField = <K extends keyof PgFormValues>(key: K, value: PgFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setFieldErrors((current) => {
      if (!current[key]) {
        return current
      }
      const { [key]: _removed, ...rest } = current
      return rest
    })
  }

  const renderLabel = (field: keyof PgFormValues, text: string) => (
    <label>
      {text}
      {requiredFields.has(field) ? <span className="required-mark"> *</span> : null}
    </label>
  )

  const showFieldError = (field: keyof PgFormValues) =>
    fieldErrors[field] ? <small className="upload-error-text">{fieldErrors[field]}</small> : null

  const toggleAmenity = (amenity: string) => {
    setForm((current) => ({
      ...current,
      amenities: current.amenities.includes(amenity)
        ? current.amenities.filter((item) => item !== amenity)
        : [...current.amenities, amenity],
    }))
  }

  const selectCurrentLocation = () => {
    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const nextCoords: [number, number] = [position.coords.latitude, position.coords.longitude]
      if (!isWithinBengaluru(nextCoords)) {
        setLocationError('Selected location is outside permitted Bengaluru boundary.')
        return
      }

      setLocationError('')
      setIsAreaManuallyEditable(false)
      setMapCoords(nextCoords)
      setField('mapsLocation', toMapUrl(nextCoords))
      setField('latitude', nextCoords[0])
      setField('longitude', nextCoords[1])

      setIsResolvingArea(true)
      const area = await resolveAreaFromCoordinates(nextCoords)
      if (area) {
        setField('area', area)
        setDetectedArea(area)
        setAreaResolveNote(`Area auto-selected: ${area}`)
      } else {
        setAreaResolveNote('Unable to map this point to the allowed Bangalore areas. Please select one manually.')
      }
      setIsResolvingArea(false)
    })
  }

  const submit = async () => {
    const nextFieldErrors: Partial<Record<keyof PgFormValues, string>> = {}
    for (const field of requiredFields) {
      if (isMissingRequired(field)) {
        nextFieldErrors[field] = `${FIELD_LABELS[field]} is required`
      }
    }

    if (form.contactPhone.trim() && !/^\d{10}$/.test(form.contactPhone.trim())) {
      nextFieldErrors.contactPhone = 'Contact phone must be exactly 10 digits'
    }

    const weeklyMenu = parseWeeklyMenuText(weeklyMenuText)
    if (requiredFields.has('weeklyMenu') && weeklyMenu.length < 7) {
      nextFieldErrors.weeklyMenu = 'Please provide menu items for all 7 days.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      const firstInvalidField = Object.keys(nextFieldErrors)[0] as keyof PgFormValues
      const input = document.querySelector<HTMLElement>(`[data-field="${firstInvalidField}"] input, [data-field="${firstInvalidField}"] textarea, [data-field="${firstInvalidField}"] button`)
      input?.focus()
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const rawPhotos = extractImageUrls(imageUrlsText)

    const photos = sanitizeImageUrls(rawPhotos)

    if (rawPhotos.length !== photos.length) {
      setUploadError('Some invalid image URLs were ignored. Only valid http/https URLs are sent.')
    }

    if (photos.length > 5) {
      setUploadError('You can add at most 5 images per PG.')
      return
    }

    const effectiveCoords = mapCoords ?? parseCoordinatesFromMapUrl(form.mapsLocation)
    if (!effectiveCoords || !isWithinBengaluru(effectiveCoords)) {
      setLocationError('Location must be selected within Bengaluru boundary before saving.')
      setFieldErrors((current) => ({
        ...current,
        mapsLocation: 'Please select a valid location inside Bengaluru.',
      }))
      return
    }

    setLocationError('')

    const payload: PgFormValues = {
      ...form,
      name: form.name.trim(),
      area: form.area.trim(),
      address: form.address.trim(),
      mapsLocation: toMapUrl(effectiveCoords),
      latitude: effectiveCoords[0],
      longitude: effectiveCoords[1],
      weeklyMenu,
      photos,
    }

    await onSubmit(payload)
  }

  const uploadSelectedImages = async () => {
    if (selectedFiles.length === 0) {
      setUploadError('Please select image files first.')
      return
    }

    if (selectedFiles.length > 5) {
      setUploadError('Select up to 5 images at a time.')
      return
    }

    setUploadError('')
    setIsUploadingImages(true)
    try {
      const urls = await uploadPgImages(selectedFiles, {
        normalize: {
          width: 1600,
          height: 1000,
          quality: 0.9,
          mimeType: 'image/jpeg',
        },
      })
      if (urls.length === 0) {
        setUploadError('No image URLs were returned by server.')
        return
      }

      const existing = sanitizeImageUrls(extractImageUrls(imageUrlsText))

      if (existing.length + urls.length > 5) {
        setUploadError('You can add at most 5 images per PG.')
        return
      }

      const merged = Array.from(new Set([...existing, ...urls]))
      setImageUrlsText(merged.join('\n'))
      setSelectedFiles([])
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Image upload failed')
    } finally {
      setIsUploadingImages(false)
    }
  }

  return (
    <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="app-dialog app-dialog-wide">
        <div className="app-dialog-head">
          <div>
            <h3>{title}</h3>
            <p>{mode === 'create' ? 'Create PG details and submit for approval.' : 'Update PG details and save changes.'}</p>
          </div>
          <button type="button" className="dialog-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="form-grid two-col pg-form-grid">
          <div className={getFieldClassName('name')} data-field="name">
            {renderLabel('name', 'PG name')}
            <input value={form.name} onChange={(event) => setField('name', event.target.value)} />
            {showFieldError('name')}
            {showPendingNote('name')}
          </div>
          <div className={getFieldClassName('area')} data-field="area">
            {renderLabel('area', 'Area')}
            {isAreaManuallyEditable ? (
              <CustomDropdown
                ariaLabel="PG area"
                value={form.area}
                onChange={(value) => setField('area', value)}
                options={areaOptions}
              />
            ) : (
              <input value={form.area} readOnly placeholder="Area is prefilled after selecting location" />
            )}
            <small className="section-sub">
              {isAreaManuallyEditable
                ? 'Area is editable. Select from dropdown.'
                : 'Area is prefilled after selecting location.'}
              <button
                type="button"
                className="inline-link-button inline-link-button-gap"
                onClick={() => setIsAreaManuallyEditable((current) => !current)}
              >
                {isAreaManuallyEditable ? 'Lock area' : 'Edit area'}
              </button>
            </small>
            {showFieldError('area')}
            {showPendingNote('area')}
          </div>
          <div className="form-field" data-field="baseRent">
            {renderLabel('baseRent', 'Starting rent')}
            <input
              type="number"
              step={500}
              value={toNumberValue(form.baseRent)}
              onWheel={preventWheelValueChange}
              onChange={(event) => setField('baseRent', parseNumberInput(event.target.value))}
            />
            {showFieldError('baseRent')}
          </div>
          <div className="form-field" data-field="deposit">
            {renderLabel('deposit', 'Deposit')}
            <input
              type="number"
              value={toNumberValue(form.deposit)}
              onWheel={preventWheelValueChange}
              onChange={(event) => setField('deposit', parseNumberInput(event.target.value))}
            />
            {showFieldError('deposit')}
          </div>
          <div className="form-field" data-field="maintenance">
            {renderLabel('maintenance', 'Maintenance')}
            <input
              type="number"
              value={toNumberValue(form.maintenance)}
              onWheel={preventWheelValueChange}
              onChange={(event) => setField('maintenance', parseNumberInput(event.target.value))}
            />
            {showFieldError('maintenance')}
          </div>
          <div className="form-field" data-field="foodCharges">
            {renderLabel('foodCharges', 'Food charges')}
            <input
              type="number"
              value={toNumberValue(form.foodCharges)}
              onWheel={preventWheelValueChange}
              onChange={(event) => setField('foodCharges', parseNumberInput(event.target.value))}
            />
            {showFieldError('foodCharges')}
          </div>
          <div className="form-field" data-field="otherCharges">
            {renderLabel('otherCharges', 'Other charges')}
            <input
              type="number"
              value={toNumberValue(form.otherCharges)}
              onWheel={preventWheelValueChange}
              onChange={(event) => setField('otherCharges', parseNumberInput(event.target.value))}
            />
            {showFieldError('otherCharges')}
          </div>
          <div className="form-field" data-field="gender">
            {renderLabel('gender', 'Gender')}
            <CustomDropdown
              ariaLabel="PG gender"
              value={form.gender}
              onChange={(value) => setField('gender', value as Gender)}
              options={[
                { label: 'Men', value: 'Men' },
                { label: 'Women', value: 'Women' },
                { label: 'Co-ed', value: 'Co-ed' },
              ]}
            />
            {showFieldError('gender')}
          </div>
          <div className="form-field" data-field="totalRooms">
            {renderLabel('totalRooms', 'Total rooms')}
            <input
              type="number"
              value={toNumberValue(form.totalRooms)}
              onWheel={preventWheelValueChange}
              onChange={(event) => setField('totalRooms', parseNumberInput(event.target.value))}
            />
            {showFieldError('totalRooms')}
          </div>
          <div className="form-field" data-field="totalBeds">
            {renderLabel('totalBeds', 'Total capacity (beds)')}
            <input
              type="number"
              value={toNumberValue(form.totalBeds)}
              onWheel={preventWheelValueChange}
              onChange={(event) => setField('totalBeds', parseNumberInput(event.target.value))}
            />
            {showFieldError('totalBeds')}
          </div>
          <div className={getFieldClassName('totalFloors')} data-field="totalFloors">
            {renderLabel('totalFloors', 'Total floors')}
            <input
              type="number"
              value={toNumberValue(form.totalFloors)}
              onWheel={preventWheelValueChange}
              onChange={(event) => setField('totalFloors', parseNumberInput(event.target.value))}
            />
            {showFieldError('totalFloors')}
            {showPendingNote('totalFloors')}
          </div>
          <div className={getFieldClassName('pgType')} data-field="pgType">
            {renderLabel('pgType', 'PG type')}
            <input value={form.pgType} onChange={(event) => setField('pgType', event.target.value)} placeholder="Hostel / Co-living / Managed" />
            {showFieldError('pgType')}
            {showPendingNote('pgType')}
          </div>
        </div>

        <div className={getFieldClassName('address')} data-field="address">
          {renderLabel('address', 'Address')}
          <input
            value={form.address}
            onChange={(event) => setField('address', event.target.value)}
            placeholder="Door no, street, landmark"
          />
          {showFieldError('address')}
          {showPendingNote('address')}
        </div>

        <div className="form-grid two-col pg-form-grid">
          <div className={getFieldClassName('pincode')} data-field="pincode">
            {renderLabel('pincode', 'Pincode')}
            <input value={form.pincode} onChange={(event) => setField('pincode', event.target.value)} placeholder="5600xx" />
            {showFieldError('pincode')}
            {showPendingNote('pincode')}
          </div>
          <div className={getFieldClassName('curfew')} data-field="curfew">
            {renderLabel('curfew', 'Curfew timing')}
            <input value={form.curfew} onChange={(event) => setField('curfew', event.target.value)} placeholder="e.g. 11:00 PM" />
            {showFieldError('curfew')}
            {showPendingNote('curfew')}
          </div>
          <div className={getFieldClassName('description')} style={{ gridColumn: '1 / -1' }} data-field="description">
            {renderLabel('description', 'Description')}
            <textarea rows={3} value={form.description} onChange={(event) => setField('description', event.target.value)} placeholder="Briefly describe your PG" />
            {showFieldError('description')}
            {showPendingNote('description')}
          </div>
          <div className={getFieldClassName('securityInfo')} style={{ gridColumn: '1 / -1' }} data-field="securityInfo">
            {renderLabel('securityInfo', 'Security information')}
            <textarea rows={2} value={form.securityInfo} onChange={(event) => setField('securityInfo', event.target.value)} placeholder="CCTV, guard, biometric access, etc." />
            {showFieldError('securityInfo')}
            {showPendingNote('securityInfo')}
          </div>
          <div className={getFieldClassName('electricityRules')} style={{ gridColumn: '1 / -1' }} data-field="electricityRules">
            {renderLabel('electricityRules', 'Electricity rules')}
            <textarea rows={2} value={form.electricityRules} onChange={(event) => setField('electricityRules', event.target.value)} placeholder="Electricity included / separate meter details" />
            {showFieldError('electricityRules')}
            {showPendingNote('electricityRules')}
          </div>
        </div>

        <div className="form-grid two-col pg-form-grid">
          <div className={getFieldClassName('contactName')} data-field="contactName">
            {renderLabel('contactName', 'Contact person name')}
            <input value={form.contactName} onChange={(event) => setField('contactName', event.target.value)} />
            {showFieldError('contactName')}
            {showPendingNote('contactName')}
          </div>
          <div className={getFieldClassName('contactPhone')} data-field="contactPhone">
            {renderLabel('contactPhone', 'Contact phone')}
            <input
              value={form.contactPhone}
              maxLength={10}
              inputMode="numeric"
              pattern="[0-9]{10}"
              onChange={(event) => setField('contactPhone', event.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit phone"
            />
            {showFieldError('contactPhone')}
            {showPendingNote('contactPhone')}
          </div>
          <div className="form-field" data-field="foodAvailable">
            {renderLabel('foodAvailable', 'Food available')}
            <CustomDropdown
              ariaLabel="Food available"
              value={form.foodAvailable ? 'yes' : 'no'}
              onChange={(value) => setField('foodAvailable', value === 'yes')}
              options={[
                { label: 'Yes', value: 'yes' },
                { label: 'No', value: 'no' },
              ]}
            />
            {showFieldError('foodAvailable')}
          </div>
          <div className={getFieldClassName('weeklyMenu')} style={{ gridColumn: '1 / -1' }} data-field="weeklyMenu">
            {renderLabel('weeklyMenu', '7-day menu (flexible)')}
            <div className="menu-grid">
              {DAYS.map((day) => {
                const lines = weeklyMenuText.split('\n').map((line) => line.trim())
                const currentLine = lines.find((line) => line.toLowerCase().startsWith(`${day.toLowerCase()}:`))
                const value = currentLine ? currentLine.split(':').slice(1).join(':').trim() : ''
                return (
                  <div key={day} className="form-field">
                    <label>{day}</label>
                    <input
                      value={value}
                      onChange={(event) => {
                        const trimmed = event.target.value.trim()
                        const mutableLines = weeklyMenuText.split('\n').map((line) => line.trim()).filter(Boolean)
                        const nextLine = `${day}: ${trimmed}`
                        const index = mutableLines.findIndex((line) => line.toLowerCase().startsWith(`${day.toLowerCase()}:`))
                        if (index >= 0) {
                          mutableLines[index] = nextLine
                        } else {
                          mutableLines.push(nextLine)
                        }
                        const ordered = DAYS.map((d) => mutableLines.find((line) => line.toLowerCase().startsWith(`${d.toLowerCase()}:`)) || `${d}: `)
                        setWeeklyMenuText(ordered.join('\n'))
                        setFieldErrors((current) => {
                          if (!current.weeklyMenu) {
                            return current
                          }
                          const { weeklyMenu: _removed, ...rest } = current
                          return rest
                        })
                      }}
                      placeholder="Breakfast, lunch, dinner"
                    />
                  </div>
                )
              })}
            </div>
            {showFieldError('weeklyMenu')}
            <small className="section-sub">Fill all 7 days. Leave details flexible as needed.</small>
            {showPendingNote('weeklyMenu')}
          </div>
        </div>

        <div className={`pg-amenities-head ${pendingFieldSet.has('amenities') && form.amenities.length === 0 ? 'pending-group-head' : ''}`}>
          <label>Amenities</label>
          <small>
            {selectedAmenitiesCount} selected
            {pendingFieldSet.has('amenities') && form.amenities.length === 0 ? ' · Required to complete profile' : ''}
          </small>
        </div>
        <div className={`chips pg-amenities-grid ${pendingFieldSet.has('amenities') && form.amenities.length === 0 ? 'pending-group-box' : ''}`}>
          {AMENITIES.map((amenity) => (
            <button
              key={amenity}
              type="button"
              className={`chip ${form.amenities.includes(amenity) ? 'on' : ''}`}
              onClick={() => toggleAmenity(amenity)}
            >
              {amenity}
            </button>
          ))}
        </div>

        <div className={`${getFieldClassName('mapsLocation')} spaced-top`} data-field="mapsLocation">
          <div className="pg-amenities-head">
            {renderLabel('mapsLocation', 'Location from map')}
            <button type="button" className="btn btn-line" onClick={selectCurrentLocation}>
              Use current location
            </button>
          </div>
          <LocationPicker
            value={mapCoords}
            onOutOfBounds={() => {
              setLocationError('Selected location is outside permitted Bengaluru boundary.')
            }}
            onChange={async (next) => {
              if (!isWithinBengaluru(next)) {
                setLocationError('Selected location is outside permitted Bengaluru boundary.')
                return
              }

              setLocationError('')
              setIsAreaManuallyEditable(false)
              setMapCoords(next)
              setField('mapsLocation', toMapUrl(next))
              setField('latitude', next[0])
              setField('longitude', next[1])

              setIsResolvingArea(true)
              const area = await resolveAreaFromCoordinates(next)
              if (area) {
                setField('area', area)
                setDetectedArea(area)
                setAreaResolveNote(`Area auto-selected: ${area}`)
              } else {
                setAreaResolveNote('Unable to map this point to the allowed Bangalore areas. Please select one manually.')
              }
              setIsResolvingArea(false)
            }}
          />
          <small className="section-sub">{mapHint}</small>
          {isResolvingArea ? <small className="section-sub">Detecting area from map...</small> : null}
          {areaResolveNote ? <small className="section-sub">{areaResolveNote}</small> : null}
          {locationError ? <small className="upload-error-text">{locationError}</small> : null}
          {showFieldError('mapsLocation')}
          <input
            value={form.mapsLocation}
            onChange={(event) => {
              const value = event.target.value
              setField('mapsLocation', value)

              const parsedCoords = parseCoordinatesFromMapUrl(value)
              if (!parsedCoords) {
                setLocationError('Paste a valid Google Maps URL containing coordinates within Bengaluru.')
                return
              }

              if (!isWithinBengaluru(parsedCoords)) {
                setLocationError('Selected location is outside permitted Bengaluru boundary.')
                return
              }

              setLocationError('')
              setIsAreaManuallyEditable(false)
              setMapCoords(parsedCoords)
              setField('latitude', parsedCoords[0])
              setField('longitude', parsedCoords[1])
            }}
            placeholder="Or paste Google Maps URL"
          />
          {showPendingNote('mapsLocation')}
        </div>

        <div className={`${getFieldClassName('photos')} spaced-top`}>
          <label>Images (optional)</label>
          <div className="image-upload-row">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(event) => {
                setSelectedFiles(Array.from(event.target.files ?? []))
                setUploadError('')
              }}
            />
            <button type="button" className="btn btn-line" onClick={uploadSelectedImages} disabled={isUploadingImages}>
              {isUploadingImages ? 'Uploading...' : 'Upload images'}
            </button>
          </div>
          {selectedFiles.length > 0 ? (
            <small className="section-sub">{selectedFiles.length} file(s) selected (max 5)</small>
          ) : null}
          <small className="section-sub">Uploaded files are auto-cropped to 1600 x 1000 for uniform display.</small>
          {uploadError ? <small className="upload-error-text">{uploadError}</small> : null}
          <textarea
            rows={3}
            value={imageUrlsText}
            onChange={(event) => setImageUrlsText(event.target.value)}
            placeholder="Paste image URLs (one per line or combined text). We auto-detect up to 5 links."
          />
          {showPendingNote('photos')}
        </div>

        <div className="pg-form-actions">
          <button type="button" className="btn btn-line" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-brand" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

type PgDetailsDialogProps = {
  open: boolean
  item: {
    name: string
    area: string
    address?: string
    baseRent: number
    totalRooms?: number
    totalBeds?: number
    gender?: string
    status?: string
    mapsLocation?: string
    photos?: string[]
    amenities?: string[]
  } | null
  onClose: () => void
}

export function PgDetailsDialog({ open, item, onClose }: PgDetailsDialogProps) {
  if (!open || !item) {
    return null
  }

  return (
    <div className="app-dialog-backdrop" role="dialog" aria-modal="true" aria-label="PG details">
      <div className="app-dialog">
        <div className="app-dialog-head">
          <div>
            <h3>{item.name}</h3>
            <p>{item.area}</p>
          </div>
          <button type="button" className="dialog-close-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="detail-grid-compact">
          <p><strong>Address:</strong> {item.address || '-'}</p>
          <p><strong>Rent:</strong> {item.baseRent}</p>
          <p><strong>Total rooms:</strong> {item.totalRooms ?? 0}</p>
          <p><strong>Total capacity:</strong> {item.totalBeds ?? 0}</p>
          <p><strong>Gender:</strong> {item.gender || '-'}</p>
          <p><strong>Status:</strong> {item.status || '-'}</p>
        </div>

        <p><strong>Map:</strong> {item.mapsLocation ? <a href={item.mapsLocation} target="_blank" rel="noreferrer">Open location</a> : '-'}</p>

        <div className="chips spaced-top">
          {(item.amenities ?? []).map((amenity) => (
            <span key={amenity} className="chip on">{amenity}</span>
          ))}
        </div>

        {item.photos && item.photos.length > 0 ? (
          <div className="pg-preview-images spaced-top">
            {item.photos.slice(0, 6).map((url, index) => (
              <img key={`${url}-${index}`} src={url} alt={`PG ${index + 1}`} loading="lazy" />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
