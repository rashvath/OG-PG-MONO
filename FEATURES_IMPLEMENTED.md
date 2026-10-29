# NestPG Feature Inventory (Current State)

_Last updated: 2026-10-29_

## 1. Product Scope
NestPG is a full-stack PG management platform with:
- Public renter discovery flow (home, listings, PG details)
- Authentication and role-based access
- Owner dashboard and operations
- Admin dashboard and operations
- Backend APIs for listings, owner/admin workflows, residents, uploads

## 2. Architecture
- Frontend: React + TypeScript + Vite (`nestpg-web`)
- Backend: Express + TypeScript + MongoDB/Mongoose (`nestpg-api`)
- Auth: JWT-based bearer tokens
- Media: Cloudinary image upload pipeline
- Validation: Zod schemas on API routes

## 3. Frontend Features (`nestpg-web`)

### 3.1 App Shell and Routing
- Global header and footer
- Protected route gating by role (`owner`, `admin`)
- Lazy-loaded pages with suspense fallback spinner
- Route groups:
  - Public: Home, About, Listings, PG detail, Login, Register
  - Owner: Overview, PG management, Residents, Enquiries
  - Admin: Overview, PGs, Owners, Residents, Approvals, Enquiries, Users

### 3.2 Navigation and Header
- Editorial-style top nav redesign
- Role-aware nav items:
  - Owner sees `Owner`
  - Admin sees `Admin`
  - Unauthenticated users do not see owner/admin dashboard links
- Search icon + auth action + CTA (`List your PG`)
- Mobile menu drawer with route-change auto-close behavior

### 3.3 Authentication UX
- Login form with demo account quick-fill buttons
- Role-based post-login redirection:
  - customer -> listings
  - owner -> owner dashboard
  - admin -> admin dashboard
- Register flow supports:
  - Customer account creation
  - Owner application submission with PG details
- Toast feedback and inline error handling

### 3.4 Home Page
- Hero search panel (area + gender) linking to filtered listings
- Area cards derived from live listing data
- Area cards show:
  - Verified badge (`Verified by OG's`)
  - Dynamic count and starting rent
  - Background preview image when available
- Popular listings carousel/grid from live data
- Why-OG section and trust sections
- Animated numeric counters for KPI highlights

### 3.5 Listings Page
- Loads live listings from API
- Filter capabilities:
  - Area
  - Gender
  - Sharing type
  - Max budget slider
  - Amenities (multi-select)
- Sorting options:
  - Recommended
  - Price low->high
  - Price high->low
  - Top rated
- URL query sync for key filters

### 3.6 Listing Card UI
- Listing tile with tags and visual treatments
- `New` tag includes icon
- Green verified badge with icon

### 3.7 PG Detail Page
- Full two-column detail layout
- Dynamic image gallery by image count:
  - 1 image -> single hero
  - 2 images -> hero + side tile
  - 3 images -> hero + two side tiles
  - 4/5 images -> hero + stacked side tiles
  - >5 images -> `+N more` indicator
- No text overlay clutter on the main image
- Data-driven sections:
  - About
  - Rooms and pricing table
  - Amenities grid
  - 7-day menu cards
  - Property details
  - House rules
  - Location with maps link and coordinates
  - Important details card
  - Owner contact and charges card
- Right-side amount card is now non-sticky (scrolls naturally)

### 3.8 Owner Dashboard Features
- Overview KPIs:
  - Active PGs
  - Enquiries
  - Beds and occupancy
  - Active/left residents
  - Average rating
- Weekly enquiries chart
- PG management:
  - Owner can view assigned PGs
  - Owner can edit assigned PG details only
  - Pending-details checklist shown for incomplete PG fields
- Enquiries table for assigned PGs
- Residents management:
  - Add resident
  - Edit resident financial/profile details
  - Mark resident as left with settlement details
  - Search/filter by name/phone/PG, status, date range
  - Resident detail modal
  - Resident profile photo upload
- Bed inventory utility:
  - Initialize rooms/beds from configured PG capacity

### 3.9 Admin Dashboard Features
- Overview KPIs:
  - Total PGs
  - Owners
  - Users
  - Pending approvals
- Recent enquiries and PG summaries
- Quick action shortcuts
- PG management:
  - Create PG
  - Edit PG
  - View PG
  - Approve/suspend listing status
- Owner management:
  - Create owner with temporary password
  - Assign PGs to owner (multi-select)
  - View owner details and assigned PGs
  - Block/unblock owner
  - Delete owner
- Owner approvals:
  - Approve owner application (creates listing + assignment)
  - Reject owner application
- User management:
  - Block/unblock users
- Resident administration:
  - View residents
  - Mark resident left and capture final settlement metadata
- Admin enquiries table

### 3.10 Shared Form and Dialog System
- Reusable PG form dialog used by owner/admin with role-aware behavior
- Map URL + coordinates support and Bengaluru boundary enforcement messaging
- Weekly menu editor and room type handling
- File upload + manual URL workflows for photos

### 3.11 Image Handling Improvements (Recent)
- Upload-time client-side image normalization for PG images:
  - Center-crop to fixed ratio
  - Resize to `1600 x 1000`
  - Convert to JPEG before upload
- Manual image URL parsing hardened:
  - Auto-extracts multiple links from pasted mixed text
  - Handles accidentally concatenated URLs
  - Deduplicates and validates URLs

## 4. Backend Features (`nestpg-api`)

### 4.1 Core API Setup
- Security and middleware:
  - Helmet
  - CORS
  - JSON body parsing
  - Morgan request logging
- Health endpoint: `GET /api/v1/health`

### 4.2 Authentication and Authorization
- Register endpoint supports customer and owner roles
- Owner registration creates:
  - User record
  - Owner profile (pending)
  - Owner application (pending)
- Login endpoint:
  - Password verification with bcrypt
  - Blocks owner login until approved
  - Blocks blocked users
  - JWT issuance
- `GET /auth/me` to return authenticated profile
- Role-gated middleware for owner/admin routes

### 4.3 Public Listings APIs
- `GET /listings` with query filters:
  - page, limit, area, gender, maxBudget, sort (`rec`, `lo`, `hi`, `rt`)
- `GET /listings/:id` for live listing details
- Public listing responses constrained to `status: live`

### 4.4 Owner APIs
- Owner dashboard summary metrics and weekly enquiry aggregation
- Owner enquiries retrieval scoped to assigned PGs
- Owner assigned PG retrieval
- Owner PG update (`PATCH /owner/pgs/:id`) with validation for:
  - area normalization
  - coordinates pair integrity
  - Bengaluru geofence
  - 10-digit phone checks
  - 7-day weekly menu
  - room type schema
  - photo URL sanitization and max-limit
- Bed initialization API:
  - Creates missing rooms
  - Creates bed records up to configured capacity
  - Syncs listing occupancy fields
- Resident operations:
  - Create resident with automatic bed assignment fallback
  - Move resident between beds/rooms
  - Update resident core and payment fields
  - Mark resident left with settlement metadata
  - Fetch resident activity timeline

### 4.5 Admin APIs
- Dashboard summary counts
- PG listing retrieval with owner enrichment
- PG creation and update with validation and defaults
- Listing status updates
- Owner lifecycle management:
  - List owners with profile/assignment stats
  - Set owner limits (`pgLimit`, `pgCreationEnabled`)
  - Create owner (temporary credentials)
  - Assign PGs to owner (with limit checks)
  - Block/unblock owner
  - Delete owner (cleans profile/application and unassigns PGs)
- Owner applications:
  - List pending/filtered applications
  - Approve (activates profile + creates listing + assigns)
  - Reject
- User management:
  - List users
  - Block/unblock users
- Enquiries list (latest)
- Residents list and admin mark-left operation
- Global search endpoint for owners/PGs/residents

### 4.6 Upload API
- Authenticated image upload endpoint: `POST /uploads/images`
- Multer constraints:
  - In-memory upload
  - Max 5 files
  - Max 8 MB each
  - Image MIME-only
- Cloudinary upload integration
- Returns uploaded URL + metadata (dimensions, bytes, format)

## 5. Data and Domain Modeling
- MongoDB models include:
  - User
  - OwnerProfile
  - OwnerApplication
  - Listing
  - Enquiry
  - PgOwnerAssignment
  - Resident
  - ResidentActivity
  - Room
  - Bed
- Listing model supports rich metadata:
  - pricing components, amenities, menu, room types
  - occupancy counters
  - contact data
  - geolocation and map links

## 6. Validation and Business Rules
- 10-digit mobile number enforcement
- Owner approval required before owner login
- Geofence rule: location must be inside Bengaluru bounds for coordinate updates
- Weekly menu requires exactly 7 day entries where enforced
- Photos sanitized to valid HTTP/HTTPS URLs with max count limits
- Empty photo arrays in patch payloads are safely handled

## 7. UI/UX and Interaction Highlights
- Toast-based success/error feedback
- Reusable table, badge, dialog, chart, and stats card components
- Responsive navigation and dashboard layouts
- Rich PG detail information architecture with equalized content distribution

## 8. Current Known Behavior/Constraints
- Public enquiry creation endpoint is not exposed in current route set (owner/admin can view enquiries)
- Existing malformed photo URLs already stored in DB must be corrected by re-saving clean URLs
- Owner PG creation is restricted; owners edit assigned PGs while admin creates/assigns

## 9. File Locations (Reference)
- Frontend app root: `nestpg-web/`
- Backend app root: `nestpg-api/`
- This inventory: `FEATURES_IMPLEMENTED.md`
