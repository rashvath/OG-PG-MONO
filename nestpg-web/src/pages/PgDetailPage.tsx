import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { BedDouble, Building2, CheckCircle2, IndianRupee, MapPin, Phone, ShieldCheck, User } from 'lucide-react'

import { inr } from '@/lib/format'
import { fetchListingById } from '@/lib/listings-api'
import { areaGradientClass } from '@/lib/mock-data'
import type { Listing } from '@/lib/types'

export function PgDetailPage() {
  const { id } = useParams()
  const [listing, setListing] = useState<Listing | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!id) {
      setIsLoading(false)
      return
    }

    fetchListingById(id)
      .then((item) => {
        setListing(item)
        setLoadError('')
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'Unable to load listing')
      })
      .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return <div className="app-wrap"><p className="section-sub spaced-top">Loading listing...</p></div>
  }

  if (loadError) {
    return <div className="app-wrap"><p className="section-sub spaced-top">{loadError}</p></div>
  }

  if (!listing) {
    return <Navigate to="/listings" replace />
  }

  const gradient = areaGradientClass[listing.areaKey] ?? 'glass-image-koramangala'
  const galleryPhotos = listing.photos.length > 0 ? listing.photos : ['']
  const sidePhotos = galleryPhotos.slice(1, 5)
  const extraPhotoCount = Math.max(galleryPhotos.length - 5, 0)
  const galleryVisibleCount = Math.min(galleryPhotos.length, 5)
  const galleryLayoutClass =
    galleryVisibleCount <= 1 ? 'is-single' : galleryVisibleCount === 2 ? 'is-two' : galleryVisibleCount === 3 ? 'is-three' : 'is-multi'

  const amenityItems = listing.amenities.filter(Boolean)

  const visibleCharges = [
    { label: 'Security deposit', value: listing.deposit ?? 0 },
    { label: 'Maintenance', value: listing.maintenance ?? 0 },
    { label: 'Food charges', value: listing.foodCharges ?? 0 },
    { label: 'Other charges', value: listing.otherCharges ?? 0 },
  ].filter((item) => Number(item.value) > 0)

  const propertyFacts = [
    { label: 'PG type', value: listing.pgType },
    { label: 'Accommodation', value: listing.gender },
    { label: 'Total floors', value: (listing.totalFloors ?? 0) > 0 ? String(listing.totalFloors) : '' },
    { label: 'Total rooms', value: (listing.totalRooms ?? 0) > 0 ? String(listing.totalRooms) : '' },
    { label: 'Total beds', value: (listing.totalBeds ?? 0) > 0 ? String(listing.totalBeds) : '' },
  ].filter((item) => item.value)

  const houseRules = [
    listing.curfew?.trim() ? `Curfew: ${listing.curfew.trim()}` : '',
    listing.securityInfo?.trim() ? `Security: ${listing.securityInfo.trim()}` : '',
    listing.electricityRules?.trim() ? `Electricity: ${listing.electricityRules.trim()}` : '',
  ].filter(Boolean)

  const occupancySummary =
    (listing.availableBeds ?? 0) > 0
      ? `${listing.availableBeds} beds available`
      : (listing.totalBeds ?? 0) > 0
        ? `${Math.max((listing.totalBeds ?? 0) - (listing.occupiedBeds ?? 0), 0)} beds currently open`
        : (listing.availability ?? 0) > 0
          ? `${listing.availability} spots available`
          : 'Availability shared on request'

  return (
    <div className="app-wrap detail-grid detail-page-grid">
      <section className="detail-main">
        <div className={`detail-gallery ${galleryLayoutClass}`}>
          <div className={`detail-gallery-main ${gradient}`} style={galleryPhotos[0] ? { backgroundImage: `url(${galleryPhotos[0]})` } : undefined}>
            <span className="listing-tag">{listing.tag}</span>
          </div>
          {sidePhotos.length > 0 ? (
            <div className={`detail-gallery-side side-count-${Math.min(sidePhotos.length, 3)}`}>
              {sidePhotos.map((photo, index) => (
                <div key={`${photo}-${index}`} className="detail-gallery-side-card">
                  <img src={photo} alt={`${listing.name} photo ${index + 2}`} loading="lazy" />
                  {extraPhotoCount > 0 && index === sidePhotos.length - 1 ? (
                    <span className="detail-gallery-more">+{extraPhotoCount} more</span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="detail-head">
          <h1>{listing.name}</h1>
          <span className="rating-pill">{`★ ${listing.rating.toFixed(1)}`}</span>
        </div>
        <p className="section-sub">{`${listing.area}, ${listing.city ?? 'Bangalore'} · ${listing.reviewCount} reviews · ${listing.gender}`}</p>

        {listing.description?.trim() ? (
          <div className="panel">
            <h3>About this PG</h3>
            <p>{listing.description.trim()}</p>
          </div>
        ) : null}

        <div className="panel">
          <h3>Rooms and pricing</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sharing</th>
                  <th>Rent / month</th>
                  <th>Deposit</th>
                </tr>
              </thead>
              <tbody>
                {listing.roomTypes.map((room) => (
                  <tr key={room.sharing}>
                    <td>{room.sharing}</td>
                    <td>{inr(room.rent)}</td>
                    <td>{inr(room.deposit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <h3>Amenities</h3>
          <div className="detail-amenities-grid">
            {amenityItems.length === 0 ? (
              <p className="section-sub">Amenities will be updated soon.</p>
            ) : (
              amenityItems.map((amenity) => (
                <span key={amenity} className="detail-amenity-item">
                  <CheckCircle2 size={15} aria-hidden="true" />
                  {amenity}
                </span>
              ))
            )}
          </div>
        </div>

        {listing.weeklyMenu.length > 0 ? (
          <div className="panel">
            <h3>7-day food menu</h3>
            <div className="detail-menu-grid">
              {listing.weeklyMenu.map((entry) => (
                <article key={`${entry.day}-${entry.items.join('-')}`} className="detail-menu-card">
                  <h4>{entry.day}</h4>
                  <p>{entry.items.join(', ')}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

      </section>

      <aside className="detail-sidebar">
        <div className="panel sticky-panel detail-price-card">
          <p className="listing-price">
            {inr(listing.baseRent)}
            <span> /month onwards</span>
          </p>

          <div className="detail-side-kpis">
            <p><BedDouble size={15} aria-hidden="true" /> {occupancySummary}</p>
            <p><ShieldCheck size={15} aria-hidden="true" /> {listing.tag} listing</p>
          </div>

          {(listing.contactName?.trim() || listing.contactPhone?.trim()) ? (
            <div className="detail-owner-contact">
              <h4>Owner contact</h4>
              {listing.contactName?.trim() ? <p><User size={14} aria-hidden="true" /> {listing.contactName.trim()}</p> : null}
              {listing.contactPhone?.trim() ? <p><Phone size={14} aria-hidden="true" /> {listing.contactPhone.trim()}</p> : null}
            </div>
          ) : null}

          {visibleCharges.length > 0 ? (
            <div className="detail-charge-list">
              <h4>Booking charges</h4>
              {visibleCharges.map((charge) => (
                <p key={charge.label}>
                  <span>{charge.label}</span>
                  <strong>{inr(charge.value)}</strong>
                </p>
              ))}
            </div>
          ) : null}
        </div>

        <div className="panel">
          <h3>Property details</h3>
          <div className="detail-facts-grid">
            {propertyFacts.length > 0 ? (
              propertyFacts.map((fact) => (
                <div key={fact.label} className="detail-fact-item">
                  <span>{fact.label}</span>
                  <strong>{fact.value}</strong>
                </div>
              ))
            ) : (
              <p className="section-sub">Detailed property information is being updated.</p>
            )}
          </div>
        </div>

        <div className="panel">
          <h3>House rules</h3>
          {houseRules.length > 0 ? (
            <ul className="detail-rule-list">
              {houseRules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          ) : (
            <p>House rules will be shared by the owner before booking confirmation.</p>
          )}
        </div>

        <div className="panel detail-location-card">
          <h3>Location</h3>
          <p><MapPin size={14} aria-hidden="true" /> {listing.address?.trim() ? `${listing.address.trim()}, ${listing.area}` : `${listing.area}, ${listing.city ?? 'Bangalore'}`}</p>
          {listing.mapsLocation?.trim() ? (
            <a href={listing.mapsLocation.trim()} target="_blank" rel="noreferrer" className="listing-link">
              Open in maps →
            </a>
          ) : null}
          {listing.latitude && listing.longitude ? (
            <p className="section-sub">Coordinates: {listing.latitude.toFixed(5)}, {listing.longitude.toFixed(5)}</p>
          ) : null}
        </div>

        <div className="panel detail-policy-card">
          <h3>Important details</h3>
          <p><Building2 size={14} aria-hidden="true" /> Accommodation: {listing.gender}</p>
          {listing.foodAvailable ? <p><IndianRupee size={14} aria-hidden="true" /> Food service available</p> : null}
          {(listing.availability ?? 0) > 0 ? <p><BedDouble size={14} aria-hidden="true" /> {listing.availability} rooms currently open</p> : null}
        </div>
      </aside>
    </div>
  )
}
