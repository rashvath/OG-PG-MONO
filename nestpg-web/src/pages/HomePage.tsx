"use client"

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Building2, MapPin, MessageCircle, Search, ShieldCheck, Users, Wallet } from 'lucide-react'

import { CustomDropdown } from '@/components/ui/CustomDropdown'
import { ListingCard } from '@/components/ui/ListingCard'
import { fetchLiveListings } from '@/lib/listings-api'
import { areaGradientClass, neighborhoodMeta } from '@/lib/mock-data'
import { inr } from '@/lib/format'
import sectionVisual from '@/assets/section2.png'
import type { Listing } from '@/lib/types'
import { NumberTicker } from '@/registry/magicui/number-ticker'

export function HomePage() {
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [area, setArea] = useState('')
  const [gender, setGender] = useState('')

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

  const popular = useMemo(() => listings.slice(0, 4), [listings])
  const areas = useMemo(
    () => Array.from(new Set(listings.map((item) => item.area))).sort((a, b) => a.localeCompare(b)),
    [listings],
  )

  const areaStats = useMemo(() => {
    const stats = new Map<string, { count: number; startAt: number }>()
    for (const listing of listings) {
      const current = stats.get(listing.area)
      if (!current) {
        stats.set(listing.area, { count: 1, startAt: listing.baseRent })
      } else {
        stats.set(listing.area, {
          count: current.count + 1,
          startAt: Math.min(current.startAt, listing.baseRent),
        })
      }
    }
    return stats
  }, [listings])

  const areaPreviewImage = useMemo(() => {
    const preview = new Map<string, string>()
    for (const listing of listings) {
      if (preview.has(listing.area)) {
        continue
      }
      const firstPhoto = listing.photos[0]
      if (firstPhoto) {
        preview.set(listing.area, firstPhoto)
      }
    }
    return preview
  }, [listings])

  const homeStats = useMemo(() => {
    const verifiedCount = listings.length
    const areaCount = areas.length

    const ratedListings = listings.filter((item) => Number.isFinite(item.rating) && item.rating > 0)
    const totalReviews = ratedListings.reduce((sum, item) => sum + Math.max(item.reviewCount, 0), 0)

    const averageRatingRaw =
      totalReviews > 0
        ? ratedListings.reduce((sum, item) => sum + item.rating * Math.max(item.reviewCount, 0), 0) / totalReviews
        : ratedListings.length > 0
          ? ratedListings.reduce((sum, item) => sum + item.rating, 0) / ratedListings.length
          : 0

    return {
      verifiedCount,
      areaCount,
      averageRating: Number(averageRatingRaw.toFixed(1)),
    }
  }, [areas.length, listings])

  const searchParams = new URLSearchParams()
  if (area) {
    searchParams.set('area', area)
  }
  if (gender) {
    searchParams.set('gender', gender)
  }
  const searchHref = `/listings${searchParams.size ? `?${searchParams.toString()}` : ''}`

  return (
    <>
      <section className="hero-block">
        <div className="app-wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow hero-anim hero-anim-eyebrow">OG PG Editorial Collection</p>
            <h1 className="hero-anim hero-anim-title">
              Find a place
              <br />
              worth calling home.
            </h1>
            <p className="hero-anim hero-anim-subtext">
              Verified PGs across Bangalore, with real photographs, transparent pricing, and people you can
              actually call.
            </p>

            <div className="glass-search hero-anim hero-anim-search" role="search" aria-label="Search PGs">
              <div className="search-field">
                <MapPin size={16} />
                <CustomDropdown
                  className="search-dropdown"
                  ariaLabel="Area"
                  value={area}
                  onChange={setArea}
                  placeholder="Where in Bangalore?"
                  options={[
                    { label: 'Where in Bangalore?', value: '' },
                    ...areas.map((areaOption) => ({ label: areaOption, value: areaOption })),
                  ]}
                />
              </div>
              <div className="search-field">
                <Users size={16} />
                <CustomDropdown
                  className="search-dropdown"
                  ariaLabel="Gender"
                  value={gender}
                  onChange={setGender}
                  placeholder="Who's staying?"
                  options={[
                    { label: "Who's staying?", value: '' },
                    { label: 'Men', value: 'Men' },
                    { label: 'Women', value: 'Women' },
                    { label: 'Co-ed', value: 'Co-ed' },
                  ]}
                />
              </div>
              <Link to={searchHref} className="btn btn-brand search-btn">
                <Search size={16} />
                Search
              </Link>
            </div>
          </div>

          <div className="hero-photo-wrap">
            <div className="hero-photo" aria-hidden="true" />
            <div className="hero-photo-note">{homeStats.verifiedCount} Verified PGs</div>
            <div className="hero-photo-note second">Trusted by students and professionals</div>
          </div>
        </div>
      </section>

      <section className="app-wrap page-section">
        <h2>Where do you want to live?</h2>
        <p className="section-sub">Explore Bangalore's most connected neighbourhoods.</p>
        {loadError ? <p className="section-sub">{loadError}</p> : null}
        <div className="areas-grid">
          {areas.map((areaName, idx) => {
            const key = areaName.toLowerCase().replace(/\s+/g, '-')
            const count = areaStats.get(areaName)?.count ?? 0
            const startAt = neighborhoodMeta[key]?.startAt ?? areaStats.get(areaName)?.startAt ?? 8000
            const variant = idx === 0 || idx === 1 ? 'area-card area-card-large' : 'area-card'
            const preview = areaPreviewImage.get(areaName)
            return (
              <Link key={areaName} to={`/listings?area=${encodeURIComponent(areaName)}`} className={variant}>
                <div
                  className={`area-thumb ${areaGradientClass[key]}`}
                  style={preview ? { backgroundImage: `url(${preview})` } : undefined}
                  aria-hidden="true"
                />
                <span className="area-verified-badge">
                  <ShieldCheck size={12} aria-hidden="true" />
                  Verified by OG's
                </span>
                <div className="area-content">
                  <strong>{areaName}</strong>
                  <span>{String(count).padStart(2, '0')} verified PGs</span>
                  <small>{`Starts ${inr(startAt)}`}</small>
                </div>
                <span className="area-action" aria-hidden="true">
                  →
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="app-wrap page-section">
        <h2>Popular this week</h2>
        <p className="section-sub">Curated stays with transparent rent and direct owner contact.</p>
        {isLoading ? (
          <p className="section-sub">Loading listings...</p>
        ) : (
          <div className="listing-grid">
            {popular.map((listing) => (
              <ListingCard key={listing.id} listing={listing} withGlare />
            ))}
          </div>
        )}
      </section>

      <section className="app-wrap page-section why-og-section">
        <p className="eyebrow">WHY OG STAYS?</p>
        <h2 className="why-og-title">
          More than just a <em>stay</em>.
        </h2>
        <p className="section-sub why-og-sub">A simpler, safer and smarter way to find your next home in Bangalore.</p>

        <div className="why-og-grid">
          <div className="why-og-visual-wrap">
            <img src={sectionVisual} alt="Resident exploring Bangalore with OG Stays highlights" className="why-og-visual" loading="lazy" />

            <div className="why-og-float-card top-left">
              <span className="why-og-float-icon"><Building2 size={24} /></span>
              <div>
                <strong>23K+</strong>
                <small>Verified PGs</small>
              </div>
            </div>

            <div className="why-og-float-card top-right">
              <span className="why-og-float-icon"><MapPin size={24} /></span>
              <div>
                <strong>350+</strong>
                <small>Areas in Bangalore</small>
              </div>
            </div>

            <div className="why-og-float-card bottom-left">
              <span className="why-og-float-icon"><Users size={24} /></span>
              <div>
                <strong>100K+</strong>
                <small>Happy Residents</small>
              </div>
            </div>
          </div>

          <div className="why-og-points">
            <article>
              <span className="why-og-point-icon"><Building2 size={24} /></span>
              <div>
                <h3>Wide Choice</h3>
                <p>Explore 23K+ verified PGs across 350+ areas in Bangalore. Find the right stay that fits your lifestyle and budget.</p>
              </div>
            </article>

            <article>
              <span className="why-og-point-icon"><Wallet size={24} /></span>
              <div>
                <h3>Transparent Pricing</h3>
                <p>See the actual rent, amenities and charges upfront. No brokerage, no hidden costs.</p>
              </div>
            </article>

            <article>
              <span className="why-og-point-icon"><ShieldCheck size={24} /></span>
              <div>
                <h3>Safe & Secure</h3>
                <p>Verified properties with proper documentation and round-the-clock security for a worry-free stay.</p>
              </div>
            </article>

            <article>
              <span className="why-og-point-icon"><MessageCircle size={24} /></span>
              <div>
                <h3>Direct Communication</h3>
                <p>Talk directly to owners and managers. No middlemen, no unnecessary delays.</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="app-wrap page-section trust-block" id="about">
        <p className="trust-headline">REAL HOMES. REAL PEOPLE. NO SURPRISES.</p>
        <div className="trust-columns">
          <article>
            <h3>VERIFIED</h3>
            <p>Every property is reviewed before appearing.</p>
          </article>
          <article>
            <h3>TRANSPARENT</h3>
            <p>See the actual rent and key details upfront.</p>
          </article>
          <article>
            <h3>DIRECT</h3>
            <p>Talk directly to owners and managers.</p>
          </article>
        </div>
      </section>

      <section className="app-wrap page-section editorial-stats">
        <div>
          <strong>
            <NumberTicker value={homeStats.verifiedCount} />
          </strong>
          <span>VERIFIED PGs</span>
        </div>
        <div>
          <strong>
            <NumberTicker value={homeStats.areaCount} />
          </strong>
          <span>BANGALORE AREAS</span>
        </div>
        <div>
          <strong>
            <NumberTicker value={homeStats.averageRating} decimalPlaces={1} suffix="/5" />
          </strong>
          <span>AVERAGE RATING</span>
        </div>
      </section>
    </>
  )
}
