import { Link } from 'react-router-dom'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'

import GlareHover from '@/components/ui/GlareHover'
import { areaGradientClass } from '@/lib/mock-data'
import { inr } from '@/helpers/format'
import type { Listing } from '@/lib/types'

interface ListingCardProps {
  listing: Listing
  withGlare?: boolean
}

export function ListingCard({ listing, withGlare = false }: ListingCardProps) {
  const gradient = areaGradientClass[listing.areaKey] ?? 'glass-image-koramangala'
  const [failedPhotoUrls, setFailedPhotoUrls] = useState<Record<string, true>>({})

  const photos = useMemo(() => {
    const unusableMarkers = ['placeholder', 'dummy', 'no-image', 'noimage', 'transparent', 'checkerboard']
    return listing.photos.filter((photo) => {
      const normalized = photo.trim().toLowerCase()
      if (!normalized || failedPhotoUrls[photo]) {
        return false
      }
      return !unusableMarkers.some((marker) => normalized.includes(marker))
    })
  }, [failedPhotoUrls, listing.photos])

  const hasPhotos = photos.length > 0
  const availability = Number(listing.id) % 2 === 0 ? 'Available' : 'Limited availability'

  const tile = (
    <div className="listing-tile">
      <div className="listing-tile-media" aria-label="Listing photos">
        {hasPhotos ? (
          <div className="listing-tile-track">
            {photos.map((photo, index) => (
              <figure key={`${listing.id}-${index}`} className={`listing-tile-image ${gradient}`}>
                <img
                  className="listing-tile-image-media"
                  src={photo}
                  alt={`${listing.name} photo ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  onError={() => setFailedPhotoUrls((current) => ({ ...current, [photo]: true }))}
                />
              </figure>
            ))}
          </div>
        ) : (
          <div className={`listing-tile-image listing-tile-fallback ${gradient}`}>
            <p>Photo unavailable</p>
          </div>
        )}
      </div>

      {hasPhotos && photos.length > 1 ? (
        <div className="listing-tile-dots" aria-hidden="true">
          {photos.map((_, index) => (
            <span key={`${listing.id}-dot-${index}`} className="listing-tile-dot" />
          ))}
        </div>
      ) : null}

      <span className="listing-tag">
        <Sparkles size={11} aria-hidden="true" />
        {listing.tag}
      </span>
      <span className="listing-verified-badge">
        <ShieldCheck size={11} aria-hidden="true" />
        Verified by OG&apos;s
      </span>
    </div>
  )

  return (
    <Link to={`/pg/${listing.id}`} className="listing-card">
      {withGlare ? (
        <GlareHover
          className="listing-tile-glare"
          width="100%"
          borderRadius="0px"
          mode="hover"
          variant="streak"
          glareColor="#ffffff"
          glareOpacity={0.45}
          glareSize={28}
          softness={0.65}
          glareAngle={-45}
          blendMode="screen"
          rimGlint={true}
          transitionDuration={650}
        >
          {tile}
        </GlareHover>
      ) : (
        tile
      )}
      <div className="listing-body">
        <h3 className="listing-title">{listing.name}</h3>
        <p className="listing-meta">{listing.area}</p>
        <p className="listing-price">{inr(listing.baseRent)}<span>/month</span></p>
        <p className="property-sub-row">Private Room · {availability}</p>
        <p className="trust-state">✓ Verified listing</p>
        <p className="listing-link">View property →</p>
      </div>
    </Link>
  )
}
