import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import type { Enquiry, Listing, Owner, User } from './types'

interface StoreContextValue {
  listings: Listing[]
  owners: Owner[]
  users: User[]
  enquiries: Enquiry[]
  addListing: (listing: Omit<Listing, 'id' | 'status' | 'rating' | 'reviewCount' | 'tag'>) => void
  addEnquiry: (input: Omit<Enquiry, 'id' | 'status' | 'dateLabel'>) => void
  toggleListingStatus: (listingId: string) => void
  verifyOwner: (ownerId: string) => void
  toggleUserStatus: (userId: string) => void
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [listings, setListings] = useState<Listing[]>([])
  const [owners, setOwners] = useState<Owner[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])

  const value = useMemo<StoreContextValue>(
    () => ({
      listings,
      owners,
      users,
      enquiries,
      addListing: (listingInput) => {
        setListings((current) => [
          {
            ...listingInput,
            id: String(current.length + 1),
            status: 'pending',
            rating: 4,
            reviewCount: 0,
            tag: 'New',
          },
          ...current,
        ])
      },
      addEnquiry: ({ name, listingId, phone }) => {
        setEnquiries((current) => [
          {
            id: String(current.length + 1),
            name,
            listingId,
            phone,
            dateLabel: 'Today',
            status: 'new',
          },
          ...current,
        ])
      },
      toggleListingStatus: (listingId) => {
        setListings((current) =>
          current.map((listing) => {
            if (listing.id !== listingId) {
              return listing
            }
            return {
              ...listing,
              status: listing.status === 'live' ? 'suspended' : 'live',
            }
          }),
        )
      },
      verifyOwner: (ownerId) => {
        setOwners((current) =>
          current.map((owner) => (owner.id === ownerId ? { ...owner, kycStatus: 'verified' } : owner)),
        )
      },
      toggleUserStatus: (userId) => {
        setUsers((current) =>
          current.map((user) =>
            user.id === userId
              ? { ...user, status: user.status === 'active' ? 'blocked' : 'active' }
              : user,
          ),
        )
      },
    }),
    [listings, owners, users, enquiries],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used inside StoreProvider')
  }
  return context
}
