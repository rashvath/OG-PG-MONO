# NestPG API

Express 5 · TypeScript · Mongoose · MongoDB · JWT authentication

## Setup

```bash
cd nestpg-api
npm install
cp .env.example .env
npm run dev
```

The API listens on port `4000` by default. Configure `MONGO_URI`, `JWT_SECRET`,
and the email settings in `.env` before running it. Never commit `.env`.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | API port (default `4000`) |
| `MONGO_URI` | Yes | MongoDB connection URI |
| `JWT_SECRET` | Yes | Secret used to sign access and reset tokens |
| `CLOUDINARY_URL` | For image uploads | Cloudinary upload configuration |
| `GMAIL_USER` | When `SEND_OTP=true` | Gmail account used to send OTP email |
| `GMAIL_APP_PASSWORD` | When `SEND_OTP=true` | Gmail app password |
| `GMAIL_FROM` | No | Optional sender display/address |
| `SEND_OTP` | No | `true` sends email; `false` uses the development keyword |
| `OTP_KEYWORD` | No | Development OTP when sending is disabled (default `1234`) |

OTP codes expire after 10 minutes and allow up to five incorrect attempts.
Password-reset tokens expire after 15 minutes.

## Authentication routes

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/v1/auth/send-registration-otp` | Send a registration OTP |
| `POST` | `/api/v1/auth/register` | Register with required `otpCode` |
| `POST` | `/api/v1/auth/login` | Sign in |
| `GET` | `/api/v1/auth/me` | Get the authenticated user |
| `POST` | `/api/v1/auth/forgot-password` | Request a reset OTP |
| `POST` | `/api/v1/auth/verify-reset-otp` | Verify reset OTP and receive a reset token |
| `POST` | `/api/v1/auth/reset-password` | Set a new password with the reset token |

Forgot-password requests return the same response whether or not the email is
registered. Development OTPs are logged by the API when `SEND_OTP=false`.

## Other route groups

- `/api/v1/listings` — public listing search/details and owner listing creation
- `/api/v1/owner` — owner dashboard, PGs, residents, inventory, staff, and finances
- `/api/v1/admin` — admin PG, owner, user, and finance operations
- `/api/v1/tenant` — tenant profile, complaints, payment proofs, and absences
- `/api/v1/uploads` — authenticated image uploads

## Scripts

```bash
npm run dev
npm run typecheck
npm test
npm run test:coverage
npm run build
```
