# Deploy

## Prerequisites

1. **PostgreSQL database** — get one free from [Supabase](https://supabase.com), [Neon](https://neon.tech), or [Railway](https://railway.app)
2. **A strong JWT secret** — run: `openssl rand -base64 32`

## Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set these environment variables in Vercel dashboard (Settings → Environment Variables):

| Variable | Value |
|---|---|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_SECRET` | your strong random secret |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |
| `GOOGLE_CLIENT_ID` | optional |
| `GOOGLE_CLIENT_SECRET` | optional |
| `SMTP_HOST` | optional, for email |
| `SMTP_USER` | optional |
| `SMTP_PASS` | optional |
| `SMTP_FROM` | `noreply@your-domain.com` |

## Railway

1. Create a new project from your Git repo
2. Add a **PostgreSQL** plugin (it sets `DATABASE_URL` automatically)
3. Set remaining env vars in Railway dashboard
4. Deploy — it auto-detects `railway.json`

## After first deploy

The build command runs `prisma db push` which creates tables. The seed data won't run automatically. To seed:

```bash
# Via Railway shell
npx prisma db push --schema=prisma/schema.prod.prisma
npx tsx --prisma-schema=prisma/schema.prod.prisma prisma/seed.ts
```

## Demo accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@eventicate.com | password123 |
| Customer | customer@eventicate.com | password123 |
| Provider | pa@soundpro.com | password123 |
| Provider | catering@delight.com | password123 |
| Provider | venue@grandhall.com | password123 |
