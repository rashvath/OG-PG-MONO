# NestPG Web

React + Vite implementation of the NestPG prototype.

## Features implemented

- Component-based routing for customer, owner, and admin pages
- Dark and light theme toggling
- Confetti interaction and animated circular progress component
- Dashboard graphs with Recharts
- No inline styles in TSX components

## Scripts

- npm run dev
- npm run build

## Environment

Create `.env` from `.env.example` and set:

- VITE_API_BASE_URL=http://localhost:4000/api/v1
- VITE_APP_NAME=NestPG

## Notes

This version currently uses mock in-memory frontend data while backend endpoints are available in the separate API repo at ../nestpg-api.
