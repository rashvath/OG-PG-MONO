# NestPG Web

React 19 · TypeScript · Vite · Tailwind CSS · React Router

## Setup

```bash
cd nestpg-web
npm install
cp .env.example .env
```

The example configures `VITE_API_BASE_URL=http://localhost:4000/api/v1`. Run:

```bash
npm run dev
```

The Vite development server uses port `5173`.

## Roles and routes

### Public and auth

- `/`, `/about`, `/listings`, `/pg/:id`
- `/login` and `/auth/login`
- `/register` and `/auth/register`
- `/auth/forgot-password`

### Tenant

- `/tenant/overview`
- `/tenant/complaints`
- `/tenant/payments`
- `/tenant/absences`
- `/tenant/profile-requests`

### Owner

- `/owner`, `/owner/add`, `/owner/residents`, `/owner/inventory`
- `/owner/enquiries`, `/owner/balance-sheet`, `/owner/documents`, `/owner/staff`
- `/owner/tenant-review/*`

### Admin

- `/admin`, `/admin/pgs`, `/admin/owners`, `/admin/residents`
- `/admin/approvals`, `/admin/enquiries`, `/admin/users`
- `/admin/form-config`, `/admin/balance-sheet`, `/admin/tenant-review/*`

## Design system

The shared TESTBNB design tokens live in `src/styles/tokens.css`; Tailwind
theme extensions reference those tokens.

## Scripts

```bash
npm run build
npm run lint
npm run preview
```
