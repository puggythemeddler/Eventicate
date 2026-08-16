# Deploy

Architecture: **Next.js frontend** (Vercel) + **Express API** (Render) + **PostgreSQL** (Neon).
The frontend proxies `/api/*` and `/uploads/*` to the backend via rewrites in `next.config.ts`.

## 1. Neon (database)

1. Sign up at https://neon.tech and create a project (e.g. `eventicate`).
2. Copy the **pooled** connection string — this is your `DATABASE_URL`.

## 2. Render (backend)

Deploy via the blueprint file `render.yaml` (root dir `backend`), which on start runs
`npx prisma db push --skip-generate` then `npm start`. Uploads live on a persistent 1 GB disk.

1. Render dashboard → **New → Blueprint** → pick the repo → apply `render.yaml`.
2. Set environment variables (Settings → Environment):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `JWT_SECRET` | strong random secret (must match frontend) |
| `APP_URL` | frontend URL, e.g. `https://eventicate.vercel.app` |
| `NEXT_PUBLIC_APP_URL` | same frontend URL |
| `MPESA_ENV` | `sandbox` or `production` |
| `MPESA_CONSUMER_KEY` | from Safaricom Daraja portal |
| `MPESA_CONSUMER_SECRET` | from Safaricom Daraja portal |
| `MPESA_PASSKEY` | Lipa Na M-Pesa passkey |
| `MPESA_SHORTCODE` | Paybill/Till shortcode (default `174379` sandbox) |
| `MPESA_CALLBACK_URL` | HTTPS callback, e.g. `https://eventicate-api.onrender.com/api/payments/mpesa-callback` |
| `SMTP_HOST/PORT/SECURE/USER/PASS/FROM` | optional, for email |
| `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` | optional, for Google OAuth |

Generate a secret: `openssl rand -base64 32`

3. Deploy. After the first boot (tables are created by `db push`), seed once from the Render shell:

```bash
npm run db:seed
```

### Google OAuth notes

- `GOOGLE_REDIRECT_URI` must be the **frontend** URL:
  `https://eventicate.vercel.app/api/auth/google/callback` (the session cookie is set on the app origin).
- Add that URI to the authorized redirect URIs in the Google Cloud console.

## 3. Vercel (frontend)

1. Vercel → **Add New Project** → import the repo (framework auto-detects Next.js).
2. Set environment variables:

| Variable | Value |
|---|---|
| `BACKEND_URL` | Render backend URL, e.g. `https://eventicate-api.onrender.com` |
| `JWT_SECRET` | **identical** to the backend's `JWT_SECRET` |
| `NEXT_PUBLIC_APP_URL` | `https://eventicate.vercel.app` |

3. Deploy. `/api/*` and `/uploads/*` are rewritten to `BACKEND_URL` automatically.

## Demo accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@eventicate.com | password123 |
| Customer | customer@eventicate.com | password123 |
| Provider | pa@soundpro.com | password123 |
| Provider | catering@delight.com | password123 |
| Provider | venue@grandhall.com | password123 |
