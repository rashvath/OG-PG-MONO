import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { CustomDropdown } from '@/components/ui/CustomDropdown'
import { ListingCard } from '@/components/ui/ListingCard'
import { fetchLiveListings } from '@/lib/listings-api'
import { AMENITIES } from '@/lib/mock-data'
import { listingRent, inr } from '@/lib/format'
import type { Listing } from '@/lib/types'

export function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [params, setParams] = useSearchParams()

  const [gender, setGender] = useState(() => params.get('gender') ?? '')
  const [sharing, setSharing] = useState<'Single' | 'Double' | 'Triple' | ''>('')
  const [maxBudget, setMaxBudget] = useState(50000)
  const [amenities, setAmenities] = useState<string[]>([])
  const [sort, setSort] = useState<'rec' | 'lo' | 'hi' | 'rt'>('rec')

  const area = params.get('area') ?? ''

  useEffect(() => {
    fetchLiveListings()
      .then((items) => {
        setListings(items)
        setLoadError('')
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load listings')
      })
      .finally(() => setIsLoading(false))
  }, [])

  const areaOptions = useMemo(
    () => Array.from(new Set(listings.map((item) => item.area))).sort((a, b) => a.localeCompare(b)),
    [listings],
  )

  const budgetSliderMax = useMemo(() => {
    const highestRent = listings.reduce((max, listing) => Math.max(max, listing.baseRent), 0)
    return Math.max(20000, Math.ceil(highestRent / 5000) * 5000)
  }, [listings])

  useEffect(() => {
    if (maxBudget > budgetSliderMax) {
      setMaxBudget(budgetSliderMax)
    }
  }, [budgetSliderMax, maxBudget])

  const updateArea = (nextArea: string) => {
    const nextParams = new URLSearchParams(params)
    if (nextArea) {
      nextParams.set('area', nextArea)
    } else {
      nextParams.delete('area')
    }
    setParams(nextParams)
  }

  const updateGender = (nextGender: string) => {
    setGender(nextGender)
    const nextParams = new URLSearchParams(params)
    if (nextGender) {
      nextParams.set('gender', nextGender)
    } else {
      nextParams.delete('gender')
    }
    setParams(nextParams)
  }

  const result = useMemo(() => {
    const filtered = listings
      .filter((listing) => listing.status === 'live')
      .filter((listing) => (!area ? true : listing.area === area))
      .filter((listing) => (!gender ? true : listing.gender === gender))
      .filter((listing) => listingRent(listing, sharing) <= maxBudget)
      .filter((listing) => amenities.every((amenity) => listing.amenities.includes(amenity)))

    const sorter = {
      lo: (a: (typeof filtered)[number], b: (typeof filtered)[number]) => a.baseRent - b.baseRent,
      hi: (a: (typeof filtered)[number], b: (typeof filtered)[number]) => b.baseRent - a.baseRent,
      rt: (a: (typeof filtered)[number], b: (typeof filtered)[number]) => b.rating - a.rating,
      rec: (a: (typeof filtered)[number], b: (typeof filtered)[number]) => b.reviewCount - a.reviewCount,
    }[sort]

    return [...filtered].sort(sorter)
  }, [listings, area, gender, sharing, maxBudget, amenities, sort])

  const toggleAmenity = (amenity: string) => {
    setAmenities((current) =>
      current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity],
    )
  }

  return (
    <div className="app-wrap layout-grid">
      <aside className="panel filters">
        <label>Area</label>
        <CustomDropdown
          ariaLabel="Area filter"
          value={area}
          onChange={updateArea}
          options={[
            { label: 'All areas', value: '' },
            ...areaOptions.map((option) => ({ label: option, value: option })),
          ]}
        />

        <label>Gender</label>
        <div className="chips">
          {['', 'Men', 'Women', 'Co-ed'].map((option) => (
            <button
              key={option || 'all'}
              type="button"
              className={`chip ${gender === option ? 'on' : ''}`}
              onClick={() => updateGender(option)}
            >
              {option || 'Any'}
            </button>
          ))}
        </div>

        <label>Sharing</label>
        <div className="chips">
          {['', 'Single', 'Double', 'Triple'].map((option) => (
            <button
              key={option || 'all'}
              type="button"
              className={`chip ${sharing === option ? 'on' : ''}`}
              onClick={() => setSharing(option as 'Single' | 'Double' | 'Triple' | '')}
            >
              {option || 'Any'}
            </button>
          ))}
        </div>

        <label>{`Max budget: ${inr(maxBudget)}`}</label>
        <input
          type="range"
          min={0}
          max={budgetSliderMax}
          step={500}
          value={maxBudget}
          onChange={(event) => setMaxBudget(Number(event.target.value))}
        />

        <label>Amenities</label>
        <div className="checkbox-list">
          {AMENITIES.slice(0, 6).map((amenity) => (
            <label key={amenity} className="checkbox-item">
              <input
                type="checkbox"
                checked={amenities.includes(amenity)}
                onChange={() => toggleAmenity(amenity)}
              />
              {amenity}
            </label>
          ))}
        </div>

        <label>Sort</label>
        <CustomDropdown
          ariaLabel="Sort listings"
          value={sort}
          onChange={(nextSort) => setSort(nextSort as 'rec' | 'lo' | 'hi' | 'rt')}
          options={[
            { label: 'Recommended', value: 'rec' },
            { label: 'Price: low to high', value: 'lo' },
            { label: 'Price: high to low', value: 'hi' },
            { label: 'Top rated', value: 'rt' },
          ]}
        />
      </aside>

      <section>
        <h2>{`${result.length} PGs${area ? ` in ${area}` : ' in Bangalore'}`}</h2>
        {loadError ? <p className="section-sub spaced-top">{loadError}</p> : null}
        <div className="listing-grid spaced-top">
          {isLoading ? (
            <p className="section-sub">Loading listings...</p>
          ) : result.length > 0 ? (
            result.map((listing) => <ListingCard key={listing.id} listing={listing} />)
          ) : (
            <p className="section-sub">No PGs match. Try a higher budget or fewer filters.</p>
          )}
        </div>
      </section>
    </div>
  )
}
