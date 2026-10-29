import type { Listing } from '@/lib/types'

export function inr(value: number) {
  return `INR ${value.toLocaleString('en-IN')}`
}

export function listingRent(listing: Listing, sharing: 'Single' | 'Double' | 'Triple' | '') {
  if (!sharing) {
    return listing.baseRent
  }
  const match = listing.roomTypes.find((room) => room.sharing === sharing)
  return match ? match.rent : listing.baseRent
}
