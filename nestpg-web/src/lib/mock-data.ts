import type { Enquiry, Listing, Owner, User } from './types'

export const AREAS = [
  'Koramangala',
  'HSR Layout',
  'Indiranagar',
  'Whitefield',
  'BTM Layout',
  'Marathahalli',
  'Electronic City',
  'Bellandur',
] as const

export const AMENITIES = [
  'WiFi',
  'AC',
  'Meals',
  'Laundry',
  'Power backup',
  'Hot water',
  'CCTV',
  'Gym',
  'Housekeeping',
]

const names = [
  'Sunrise Nest',
  'GreenLeaf Stay',
  'Orchid Residency',
  'Tech Park Homes',
  'Lakeview PG',
  'Maple Co-Living',
  'Urban Roost',
  'Banyan House',
  'Cubbon Court',
  'Silk Board Suites',
]

const roomMultipliers: Record<'Single' | 'Double' | 'Triple', number> = {
  Single: 1.55,
  Double: 1.2,
  Triple: 1,
}

export const listingsSeed: Listing[] = names.map((name, index) => {
  const baseRent = 6500 + ((index * 1700) % 7500)
  const area = AREAS[index % AREAS.length]
  const roomTypes = (['Single', 'Double', 'Triple'] as const).map((sharing) => {
    const rent = Math.round(baseRent * roomMultipliers[sharing])
    return {
      sharing,
      rent,
      deposit: rent * 2,
    }
  })

  return {
    id: String(index + 1),
    name,
    area,
    areaKey: area.toLowerCase().replace(/\s+/g, '-'),
    baseRent,
    gender: (['Men', 'Women', 'Co-ed'] as const)[index % 3],
    rating: Number((4 + ((index * 37) % 10) / 10).toFixed(1)),
    reviewCount: 40 + index * 23,
    amenities: AMENITIES.filter((_, i) => (i + index) % 3 !== 0 || i < 3),
    weeklyMenu: [],
    photos: [],
    status: index === 3 || index === 8 ? 'pending' : 'live',
    ownerId: String((index % 4) + 1),
    tag: (['Popular', 'Verified', 'New', 'Best value'] as const)[index % 4],
    roomTypes,
  }
})

export const ownersSeed: Owner[] = [
  { id: '1', name: 'Ramesh Gowda', phone: '98450 12345', kycStatus: 'verified' },
  { id: '2', name: 'Anita Sharma', phone: '99001 22334', kycStatus: 'verified' },
  { id: '3', name: 'Joseph DSouza', phone: '97311 55667', kycStatus: 'pending' },
  { id: '4', name: 'Lakshmi Iyer', phone: '90080 88776', kycStatus: 'verified' },
]

export const usersSeed: User[] = [
  { id: '1', name: 'Aarav Nair', email: 'aarav@mail.com', status: 'active' },
  { id: '2', name: 'Priya Reddy', email: 'priya@mail.com', status: 'active' },
  { id: '3', name: 'Karthik S', email: 'karthik@mail.com', status: 'active' },
  { id: '4', name: 'Meera Joshi', email: 'meera@mail.com', status: 'blocked' },
]

export const enquiriesSeed: Enquiry[] = [
  { id: '1', name: 'Aarav Nair', listingId: '1', phone: '98860 11223', dateLabel: '1 Nov', status: 'new' },
  { id: '2', name: 'Priya Reddy', listingId: '5', phone: '98450 99887', dateLabel: '30 Oct', status: 'new' },
  { id: '3', name: 'Karthik S', listingId: '7', phone: '99720 44556', dateLabel: '28 Oct', status: 'contacted' },
]

export const areaGradientClass: Record<string, string> = {
  koramangala: 'glass-image-koramangala',
  'hsr-layout': 'glass-image-hsr-layout',
  indiranagar: 'glass-image-indiranagar',
  whitefield: 'glass-image-whitefield',
  'btm-layout': 'glass-image-btm-layout',
  marathahalli: 'glass-image-marathahalli',
  'electronic-city': 'glass-image-electronic-city',
  bellandur: 'glass-image-bellandur',
}

export const neighborhoodMeta: Record<string, { startAt: number }> = {
  koramangala: { startAt: 9500 },
  'hsr-layout': { startAt: 9000 },
  indiranagar: { startAt: 12000 },
  whitefield: { startAt: 8500 },
  'btm-layout': { startAt: 7800 },
  marathahalli: { startAt: 8200 },
  'electronic-city': { startAt: 7400 },
  bellandur: { startAt: 9800 },
}

export const skylineBars = [
  'skyline-1',
  'skyline-2',
  'skyline-3',
  'skyline-4',
  'skyline-5',
  'skyline-6',
]
