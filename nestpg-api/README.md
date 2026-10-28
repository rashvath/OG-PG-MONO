# NestPG API

Express + TypeScript + MongoDB backend for NestPG.

## Scripts

- npm run dev
- npm run build
- npm run start
- npm run typecheck

## Environment

Copy .env.example to .env and set values.

## Main endpoints

- GET /api/v1/health
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- GET /api/v1/auth/me
- GET /api/v1/listings
- GET /api/v1/listings/:id
- POST /api/v1/listings (owner)
- GET /api/v1/owner/dashboard/summary
- GET /api/v1/owner/enquiries
- GET /api/v1/admin/dashboard/summary
- PATCH /api/v1/admin/listings/:id/status
- PATCH /api/v1/admin/users/:id/status
