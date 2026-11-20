import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { CustomDropdown } from '@/components/ui/CustomDropdown'
import { FilterDrawer } from '@/components/ui/FilterDrawer'
import { ListingCard } from '@/components/ui/ListingCard'
import { useLiveListings } from '@/api/listings-api'
import { AMENITIES } from '@/lib/mock-data'
import { listingRent, inr } from '@/helpers/format'
import type { Listing } from '@/lib/types'

export function ListingsPage() {
  const { data, loading: isLoading, error: loadError } = useLiveListings()
  const listings: Listing[] = data ?? []
  const [params, setParams] = useSearchParams()

  const [gender, setGender] = useState(() => params.get('gender') ?? '')
  const [sharing, setSharing] = useState<'Single' | 'Double' | 'Triple' | ''>('')
  const [maxBudget, setMaxBudget] = useState(50000)
  const [amenities, setAmenities] = useState<string[]>([])
  const [sort, setSort] = useState<'rec' | 'lo' | 'hi' | 'rt'>('rec')
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)

  const area = params.get('area') ?? ''

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

  const hasActiveFilters = Boolean(area || gender || sharing || amenities.length > 0 || sort !== 'rec')
  const activeFiltersCount = [Boolean(area), Boolean(gender), Boolean(sharing), amenities.length > 0, sort !== 'rec'].filter(
    Boolean,
  ).length

  const filtersContent = (
    <>
      <div className="filter-group">
        <label>Area</label>
        <CustomDropdown
          ariaLabel="Area filter"
          searchable
          searchPlaceholder="Search area..."
          minSearchOptions={1}
          value={area}
          onChange={updateArea}
          options={[
            { label: 'All areas', value: '' },
            ...areaOptions.map((option) => ({ label: option, value: option })),
          ]}
        />
      </div>

      <div className="filter-group">
        <label>Gender</label>
        <div className="chips">
          {['', 'Men', 'Women', 'Co-Living'].map((option) => (
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
      </div>

      <div className="filter-group">
        <label>Sharing</label>
        <div className="chips" role="radiogroup" aria-label="Sharing filter">
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
      </div>

      <div className="filter-group">
        <label>{`Max budget: ${inr(maxBudget)}`}</label>
        <input
          className="budget-slider"
          type="range"
          min={0}
          max={budgetSliderMax}
          step={500}
          value={maxBudget}
          onChange={(event) => setMaxBudget(Number(event.target.value))}
        />
      </div>

      <div className="filter-group">
        <label>Amenities</label>
        <div className="checkbox-list">
          {AMENITIES.slice(0, 6).map((amenity) => (
            <label key={amenity} className="checkbox-item">
              <input
                type="checkbox"
                checked={amenities.includes(amenity)}
                onChange={() => toggleAmenity(amenity)}
              />
              <span>{amenity}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-group">
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
      </div>
    </>
  )

  return (
    <div className="app-wrap layout-grid listings-layout">
      <aside className="panel filters listings-filters-desktop" aria-label="Listing filters">
        {filtersContent}
      </aside>

      <section className="listings-main" aria-label="Property listing results">
        <div className="listings-topbar">
          <FilterDrawer
            isOpen={isFilterDrawerOpen}
            onOpenChange={setIsFilterDrawerOpen}
            title="Filters"
            buttonLabel="Filters"
            onApply={() => undefined}
            onClear={() => {
              updateArea('')
              updateGender('')
              setSharing('')
              setMaxBudget(budgetSliderMax)
              setAmenities([])
              setSort('rec')
            }}
            clearLabel="Reset filters"
            closeOnApply={false}
          >
            <div className="filters listing-drawer-filters">{filtersContent}</div>
          </FilterDrawer>
          {hasActiveFilters ? <p className="listings-filter-state">Filters active · {activeFiltersCount}</p> : null}
        </div>

        <h2>{`${result.length} PGs${area ? ` in ${area}` : ' in Bangalore'}`}</h2>
        <p className="section-sub">Compare verified stays with live pricing, amenities, and availability.</p>
        {loadError ? <p className="section-sub spaced-top">{loadError}</p> : null}
        <div className="listing-grid listing-grid-page spaced-top">
          {isLoading ? (
            <p className="section-sub listing-grid-message">Loading listings...</p>
          ) : result.length > 0 ? (
            result.map((listing) => <ListingCard key={listing.id} listing={listing} />)
          ) : (
            <p className="section-sub listing-grid-message">No PGs match. Try a higher budget or fewer filters.</p>
          )}
        </div>
      </section>
    </div>
  )
}
