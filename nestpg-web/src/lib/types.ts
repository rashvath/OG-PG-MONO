export type Role = 'customer' | 'owner' | 'admin'

export type ListingStatus = 'pending' | 'live' | 'suspended' | 'rejected'

export interface Listing {
  id: string
  name: string
  address?: string
  area: string
  areaKey: string
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
  rating: number
  reviewCount: number
  amenities: string[]
  weeklyMenu: Array<{
    day: string
    items: string[]
  }>
  photos: string[]
  status: ListingStatus
  ownerId: string
  contactName?: string
  contactPhone?: string
  availability?: number
  tag: 'Popular' | 'Verified' | 'New' | 'Best value'
  roomTypes: Array<{
    sharing: 'Single' | 'Double' | 'Triple'
    rent: number
    deposit: number
  }>
}

export interface Owner {
  id: string
  name: string
  phone: string
  kycStatus: 'pending' | 'verified' | 'rejected'
}

export interface User {
  id: string
  name: string
  email: string
  status: 'active' | 'blocked'
}

export interface Enquiry {
  id: string
  name: string
  listingId: string
  phone: string
  dateLabel: string
  status: 'new' | 'contacted' | 'closed'
}
