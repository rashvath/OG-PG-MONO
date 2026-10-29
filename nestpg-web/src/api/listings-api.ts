import type { Listing } from '@/lib/types'
import { apiClient, toApiError } from './http'

type ApiListing = {
  _id: string
  name: string
  address?: string
  area: string
  city?: string
  pincode?: string
  mapsLocation?: string
  latitude?: number | null
  longitude?: number | null
  description?: string
  baseRent: number
  deposit?: number
  maintenance?: number
  electricityRules?: string
  foodCharges?: number
  otherCharges?: number
  gender: 'Men' | 'Women' | 'Co-ed'
  pgType?: string
  totalFloors?: number
  totalRooms?: number
  totalBeds?: number
  occupiedBeds?: number
  availableBeds?: number
  foodAvailable?: boolean
  curfew?: string
  securityInfo?: string
  amenities?: string[]
  weeklyMenu?: Array<{ day: string; items?: string[] }>
  photos?: string[]
  status: 'pending' | 'live' | 'suspended' | 'rejected'
  ownerId: string
  contactName?: string
  contactPhone?: string
  availability?: number
  rating?: number
  reviewCount?: number
  roomTypes?: Array<{
    sharing: 'Single' | 'Double' | 'Triple'
    rent: number
    deposit: number
  }>
}

function sanitizeWeeklyMenu(menu?: ApiListing['weeklyMenu']) {
  return (menu ?? [])
    .filter((entry) => Boolean(entry?.day?.trim()))
    .map((entry) => ({
      day: entry.day.trim(),
      items: (entry.items ?? []).map((item) => item.trim()).filter(Boolean),
    }))
    .filter((entry) => entry.items.length > 0)
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function sanitizePhotos(photos?: string[]) {
  return (photos ?? []).map((item) => item.trim()).filter((item) => Boolean(item) && isValidHttpUrl(item))
}

function toAreaKey(area: string) {
  return area.toLowerCase().replace(/\s+/g, '-')
}

function toTag(input: ApiListing): Listing['tag'] {
  if ((input.rating ?? 0) >= 4.6) {
    return 'Popular'
  }
  if ((input.reviewCount ?? 0) < 8) {
    return 'New'
  }
  return 'Verified'
}

function withFallbackRoomTypes(baseRent: number, roomTypes?: ApiListing['roomTypes']) {
  if (roomTypes && roomTypes.length > 0) {
    return roomTypes
  }

  return [
    { sharing: 'Single' as const, rent: Math.round(baseRent * 1.55), deposit: Math.round(baseRent * 3.1) },
    { sharing: 'Double' as const, rent: Math.round(baseRent * 1.2), deposit: Math.round(baseRent * 2.4) },
    { sharing: 'Triple' as const, rent: baseRent, deposit: baseRent * 2 },
  ]
}

export function normalizeListing(input: ApiListing): Listing {
  return {
    id: input._id,
    name: input.name,
    address: input.address ?? '',
    area: input.area,
    areaKey: toAreaKey(input.area),
    city: input.city ?? 'Bangalore',
    pincode: input.pincode ?? '',
    mapsLocation: input.mapsLocation ?? '',
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    description: input.description ?? '',
    baseRent: input.baseRent,
    deposit: input.deposit ?? 0,
    maintenance: input.maintenance ?? 0,
    electricityRules: input.electricityRules ?? '',
    foodCharges: input.foodCharges ?? 0,
    otherCharges: input.otherCharges ?? 0,
    gender: input.gender,
    pgType: input.pgType ?? '',
    totalFloors: input.totalFloors ?? 0,
    totalRooms: input.totalRooms ?? 0,
    totalBeds: input.totalBeds ?? 0,
    occupiedBeds: input.occupiedBeds ?? 0,
    availableBeds: input.availableBeds ?? 0,
    foodAvailable: input.foodAvailable ?? false,
    curfew: input.curfew ?? '',
    securityInfo: input.securityInfo ?? '',
    amenities: input.amenities ?? [],
    weeklyMenu: sanitizeWeeklyMenu(input.weeklyMenu),
    photos: sanitizePhotos(input.photos),
    status: input.status,
    ownerId: input.ownerId,
    contactName: input.contactName ?? '',
    contactPhone: input.contactPhone ?? '',
    availability: input.availability ?? 0,
    rating: input.rating ?? 4,
    reviewCount: input.reviewCount ?? 0,
    roomTypes: withFallbackRoomTypes(input.baseRent, input.roomTypes),
    tag: toTag(input),
  }
}

export async function fetchLiveListings() {
  try {
    const { data } = await apiClient.get<{ items?: ApiListing[] }>('/listings', {
      params: { page: 1, limit: 200, sort: 'rec' },
    })
    return (data.items ?? []).map(normalizeListing)
  } catch (error) {
    throw new Error(toApiError(error, 'Unable to fetch listings'))
  }
}

export async function fetchListingById(id: string) {
  try {
    const { data } = await apiClient.get<ApiListing>(`/listings/${id}`)
    return normalizeListing(data)
  } catch (error) {
    throw new Error(toApiError(error, 'Unable to fetch listing'))
  }
}
