import { useRef } from 'react'
import {
  Building2,
  CheckCheck,
  ClipboardCheck,
  Eye,
  Heart,
  Image as ImageIcon,
  MessageCircleMore,
  Search,
  ShieldCheck,
} from 'lucide-react'

import { AnimatedBeam } from '@/components/ui/AnimatedBeam'
import skylineImage from '@/assets/banalore_line.jpg'
import coverImage from '@/assets/bangalore.avif'

export function AboutPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const discoverRef = useRef<HTMLDivElement>(null)
  const shortlistRef = useRef<HTMLDivElement>(null)
  const centerRef = useRef<HTMLDivElement>(null)
  const ownerRef = useRef<HTMLDivElement>(null)
  const settleRef = useRef<HTMLDivElement>(null)
  const beamColor = {
    pathColor: '#e4d7c8',
    pathWidth: 1.8,
    pathOpacity: 0.32,
    gradientStartColor: '#e4b89c',
    gradientStopColor: '#cb6a4d',
    duration: 6,
    curvature: 26,
  }

  return (
    <>
      <section className="app-wrap page-section about-hero">
        <div>
          <p className="eyebrow about-title-line">About OG PG</p>
          <h2>Built for renters who want clarity before they move.</h2>
          <p className="section-sub" style={{ maxWidth: '600px', marginTop: '16px' }}>
            OG PG helps students and working professionals discover reliable paying guest stays in Bangalore with
            real photos, clear rent details, and direct owner communication.
          </p>
        </div>

        <div className="about-hero-visual" aria-hidden="true">
          <div className="about-hero-main">
            <img src={coverImage} alt="" />
          </div>
          <div className="about-hero-badge top">
            <CheckCheck size={16} />
            Verified Listings
          </div>
          <div className="about-hero-badge bottom">
            <ImageIcon size={16} />
            Clear Information
          </div>
          <div className="about-hero-mini">
            <img src={skylineImage} alt="" />
          </div>
        </div>
      </section>

      <section className="app-wrap page-section about-flow-section" style={{ paddingTop: '20px' }}>
        <p className="eyebrow about-title-line">How It Works</p>
        <h2>How the platform works</h2>
        <p className="section-sub" style={{ maxWidth: '820px' }}>
          This journey is what OG PG is designed for: discover a stay, compare details, connect with the owner,
          and move in with fewer surprises.
        </p>

        <div ref={containerRef} className="about-flow-board">
          <div ref={discoverRef} className="about-flow-step about-flow-step-discover">
            <span className="about-flow-step-num">01</span>
            <span className="about-flow-icon">
              <Search size={18} />
            </span>
            <div>
              <strong>Discover</strong>
              <p>Search by area and preferences.</p>
            </div>
          </div>

          <div ref={shortlistRef} className="about-flow-step about-flow-step-shortlist">
            <span className="about-flow-step-num">02</span>
            <span className="about-flow-icon">
              <ClipboardCheck size={18} />
            </span>
            <div>
              <strong>Shortlist</strong>
              <p>Compare photos, rent, and amenities.</p>
            </div>
          </div>

          <div ref={ownerRef} className="about-flow-step about-flow-step-connect">
            <span className="about-flow-step-num">03</span>
            <span className="about-flow-icon">
              <MessageCircleMore size={18} />
            </span>
            <div>
              <strong>Connect</strong>
              <p>Talk directly with owners.</p>
            </div>
          </div>

          <div ref={settleRef} className="about-flow-step about-flow-step-movein">
            <span className="about-flow-step-num">04</span>
            <span className="about-flow-icon">
              <Building2 size={18} />
            </span>
            <div>
              <strong>Move In</strong>
              <p>Commit with clear expectations.</p>
            </div>
          </div>

          <div ref={centerRef} className="about-flow-center" aria-hidden="true">
            <span>OG PG</span>
            <small>Clear Path To Move-In</small>
          </div>

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={discoverRef}
            toRef={centerRef}
            {...beamColor}
            startXOffset={112}
            endXOffset={-68}
            startYOffset={-8}
            endYOffset={-18}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={shortlistRef}
            toRef={centerRef}
            {...beamColor}
            curvature={-26}
            delay={0.2}
            startXOffset={112}
            endXOffset={-68}
            startYOffset={8}
            endYOffset={18}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={centerRef}
            toRef={ownerRef}
            {...beamColor}
            delay={0.2}
            startXOffset={68}
            endXOffset={-112}
            startYOffset={-18}
            endYOffset={-8}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={centerRef}
            toRef={settleRef}
            {...beamColor}
            curvature={-26}
            delay={0.2}
            startXOffset={68}
            endXOffset={-112}
            startYOffset={18}
            endYOffset={8}
          />
        </div>

        <div className="about-value-grid">
          <article className="about-value-card">
            <span className="about-value-icon">
              <Eye size={17} />
            </span>
            <div>
              <h3>Why We Exist</h3>
              <p>
                Finding a PG should not depend on guesswork. We focus on transparent details so renters can
                compare confidently and shortlist faster.
              </p>
            </div>
          </article>

          <article className="about-value-card">
            <span className="about-value-icon">
              <Building2 size={17} />
            </span>
            <div>
              <h3>How It Works</h3>
              <p>
                Owners list properties with photos, pricing, and amenities. Renters filter by area and
                preferences, then connect directly.
              </p>
            </div>
          </article>

          <article className="about-value-card">
            <span className="about-value-icon">
              <Heart size={17} />
            </span>
            <div>
              <h3>What We Prioritize</h3>
              <p>
                Verified listings, practical information, and a cleaner experience for both renters and owners.
              </p>
            </div>
          </article>
        </div>

        <article className="about-promise-strip">
          <span className="about-value-icon">
            <ShieldCheck size={17} />
          </span>
          <div>
            <h3>Our Promise</h3>
            <p>
              We are continuously improving listing quality, owner workflows, and renter discovery. The goal is
              simple: fewer surprises, better stays, and a smoother move-in journey.
            </p>
          </div>
          <img src={skylineImage} alt="" />
        </article>
      </section>
    </>
  )
}
