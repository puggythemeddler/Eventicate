# Eventicate

**Event Management Marketplace and Booking System**

Eventicate is a web-based marketplace that connects people planning events (like weddings, birthdays, corporate events, funerals, concerts, etc.) with service providers who offer the things they need (venues, sound systems, catering, photography, transport, decoration, entertainment, etc.).

Think of it like an "Uber for event services" — one website where you can:
- Create an event with all your requirements
- Find and compare service providers in your area
- Get price quotes from multiple providers
- Book and pay for services (including M-Pesa)
- Communicate with providers
- Manage everything from one dashboard

---

## Table of Contents

1. [What is this project?](#what-is-this-project)
2. [Who is it for?](#who-is-it-for)
3. [What languages and technologies are used?](#what-languages-and-technologies-are-used)
4. [Features at a glance](#features-at-a-glance)
5. [How to install and run](#how-to-install-and-run)
6. [Demo accounts](#demo-accounts)
7. [Project structure explained](#project-structure-explained)
8. [How the database works](#how-the-database-works)
9. [How the booking flow works](#how-the-booking-flow-works)
10. [Payments (M-Pesa, cards, bank)](#payments-m-pesa-cards-bank)
11. [Subscription & trial system](#subscription--trial-system)
12. [Invoices & quotes](#invoices--quotes)
13. [Currencies & locations](#currencies--locations)
14. [Dark/Light theme](#darklight-theme)
15. [Google login](#google-login)
16. [WhatsApp messaging](#whatsapp-messaging)
17. [API routes](#api-routes)
18. [Deployment](#deployment)
19. [How to customize](#how-to-customize)
20. [Security notes](#security-notes)

---

## What is this project?

Eventicate is a **full-stack web application** with two parts:

- **Frontend** — a Next.js app (in the project root) that users see and click in their browser.
- **Backend** — a separate Express + Prisma API (in the `backend/` folder) that stores data and handles logic. The frontend proxies all `/api` and `/uploads` requests to it.

The goal is a single platform where:
- **Customers** can plan entire events from start to finish
- **Service providers** (venues, DJs, caterers, etc.) can list their services and get booked
- **Administrators** can manage users, approve providers, and handle complaints

---

## Who is it for?

### Customers (event organizers)
- Wedding planners
- Families organizing funerals
- People planning birthday parties
- Companies organizing corporate events
- Schools, churches, community groups
- Anyone who needs to hire event services

### Service Providers
- **Venues** — Hotels, gardens, conference halls
- **PA & Audio** — Speakers, microphones, mixers, lighting, LED screens
- **Catering** — Food packages, drinks, waiters, decoration
- **Transport** — Vans, trucks, buses for equipment or guests
- **Media** — Photographers, videographers, drone operators
- **Entertainment** — DJs, bands, MCs, performers
- **Decoration** — Flowers, tents, chairs, tables
- **Photography/Videography** — Full-day coverage, albums

### Administrators
- Platform owners
- Support staff who manage users and complaints

---

## What languages and technologies are used?
### Programming Languages

- **TypeScript** — The main language for both frontend and backend (files end in `.ts` or `.tsx`). It's JavaScript but with extra rules that catch mistakes before the code runs. Over 99% of the codebase is TypeScript.
- **JavaScript** — Used implicitly via TypeScript (which compiles to it) and in small config/script files: `eslint.config.mjs`, `postcss.config.mjs`, and `backend/scripts/migrate-retry.mjs` (the Render migration helper).
- **CSS** — Used for styling, primarily through Tailwind utility classes and custom styles in `globals.css`.
- **SQL** — The language used to talk to the database. You usually don't write it directly — the Prisma tool handles it — but you'll find 11 hand-written raw SQL files in `backend/prisma/migrations/` (applied automatically on deploy).
- **HTML/JSX** — The markup that makes up pages and components (JSX is TypeScript's HTML-like syntax used in React).

### Markup & configuration languages

- **Prisma Schema** (`.prisma`) — A DSL that defines every database table and relation in `backend/prisma/schema.prisma`; Prisma generates the typed client and SQL migrations from it.
- **JSON** (`.json`) — Package metadata and tool config (`package.json`, `package-lock.json`, `tsconfig.json`).
- **Markdown** (`.md`) — Documentation (`README.md`, `DOCUMENTATION.md`, `DEPLOY.md`).
- **YAML** (`.yaml`/`.yml`) — Infrastructure & CI config: `render.yaml` (Render backend blueprint) and `.github/workflows/ci.yml` (GitHub Actions).
- **TOML** (`.toml`) — Prisma's migration lockfile (`backend/prisma/migrations/migration_lock.toml`).
- **SVG** (`.svg`) — Vector icon assets (`src/app/icon.svg`).

### Frameworks & Libraries

**Frontend (`src/`)**
- **Next.js 15** — A framework built on top of React that handles routing, server rendering, and page generation. Every folder inside `src/app/` with a `page.tsx` becomes a web page.
- **React 19** — A JavaScript library for building reusable UI components.
- **Tailwind CSS 4** — A CSS framework that lets you style things by adding class names directly in your JSX (e.g. `bg-blue-500`).
- **Zod** — Validation library used on both frontend and backend.
- **Jose** — Creates and verifies JSON Web Tokens (JWTs) for authentication.
- **Lucide React** — Icon set used across the UI.

**Backend (`backend/`)**
- **Express 5** — Web server framework that handles the REST API.
- **Prisma** — Database toolkit. You define the schema in `backend/prisma/schema.prisma` and Prisma generates a typed query API.
- **Zod** — Request-body validation with clear error messages.
- **Jose** — JWT creation/verification for sessions.
- **Bcryptjs** — Password hashing so passwords are never stored in plain text.
- **Nodemailer** — Sends notification emails (quotes, invoices, welcome).
- **Multer** — Handles file uploads (with Cloudinary for image storage).
- **Cloudinary** — Cloud image storage for service/equipment/venue photos and logos.
- **express-rate-limit** — Throttles requests to protect against abuse.
- **Helmet** — Sets security HTTP headers.
- **tsx** — Runs TypeScript directly in development.

### Database
- **PostgreSQL** — Production and development database (hosted on Neon in the cloud). The connection is configured via `DATABASE_URL` in `backend/.env`.

### How they all fit together

```
Browser (what the user sees)
    ↓
Next.js frontend (serves pages, proxies /api + /uploads to the backend)
    ↓
Express API backend  (handles auth, bookings, payments, documents, etc.)
    ↓
Prisma (typed database access)
    ↓
PostgreSQL (where all data is stored)
```

---

## Features at a glance

### For Customers
- **Create events** — Pick a name, type (wedding/funeral/birthday/etc.), date, location, number of guests, and budget
- **Search providers** — Filter by category, location, budget
- **View provider profiles** — Services, prices, equipment, availability calendar, reviews
- **Package Builder** — Build a complete event package by selecting multiple providers at once
- **Budget Calculator** — Get estimated costs based on real provider prices
- **Timeline Planner** — Create a schedule for your event (e.g. "10:00 — Guests arrive, 12:00 — Ceremony")
- **Shopping cart** — Add services and equipment from different providers, then generate quotes
- **Request quotes** — Ask providers for price estimates
- **Book services** — Accept quotes, pay deposits, track booking status
- **Checkout & payments** — Pay by M-Pesa (STK push), PesaPal, card, or bank transfer
- **Agreements** — Electronically sign booking agreements with a captured amount
- **Messaging** — Chat with providers, including multi-provider group threads, unread badges, read receipts, file attachments, and a button to continue the chat on WhatsApp
- **Reviews** — Rate providers after events are completed
- **Documents** — View all your quotes, invoices, and receipts in one place
- **Complaints** — Raise a dispute (type, priority, evidence files) and track the admin's resolution
- **Notifications** — A bell in the sidebar with unread badges; open the `/notifications` inbox to review everything
- **Password reset** — "Forgot password?" on the login page sends a secure, single-use email link that expires in 1 hour

### For Service Providers
- **Business profile** — Name, description, photos, location, contact info
- **Services** — List what you offer with prices
- **Equipment inventory** — Track items with quantities, conditions, rental prices
- **Menu packages** — For caterers, with per-guest pricing
- **Venues** — For venue providers, with capacity and facilities
- **Vehicles** — For transport providers
- **Availability calendar** — Mark dates as available, pending, or booked (auto-blocks on booking, race-free)
- **Dynamic pricing** — Different prices for different event types, weekends, or peak seasons
- **Quotations & invoices** — Generate professional documents for customers
- **Booking management** — Accept/confirm/reject bookings
- **Messaging** — Chat with customers (unread badges, read receipts, attachments); replies sync to WhatsApp when connected
- **Subscription** — Free trial, then choose a paid plan
- **Local sync** — Connect your local business system for offline inventory management
- **Reviews** — See what customers say and respond
- **Verification** — Submit your business registration / ID documents in **Provider → Settings**; a **Verified** badge appears on your public profile once admin approves
- **Analytics** — Track monthly revenue, bookings by status, and your top services at `/provider/analytics`
- **Complaints** — Manage disputes customers raise against your business
- **Notifications** — Bell in the sidebar with unread badges, plus a full inbox at `/notifications`

### For Administrators
- **Dashboard** — Platform stats (users, providers, events, bookings, revenue)
- **User management** — View all users, activate/deactivate accounts
- **Provider management** — Add providers manually, approve/reject registrations, review verification documents, edit profiles, deactivate/reactivate, delete, and filter by who has paid
- **Complaint handling** — Full dispute resolution: complaint type, priority, evidence, admin notes, and optional refund amount
- **Subscription plans** — Create and manage pricing tiers
- **Branding** — Manage logos and app name
- **Payment configuration** — Set M-Pesa credentials
- **WhatsApp integration** — Connect the platform's WhatsApp Business account (two-way chat)
- **Location data** — Manage countries and subdivisions

---

## How to install and run

The project has two apps: the **frontend** (project root) and the **backend** (`backend/`). You'll run both in development.

### Step 1: What you need installed
- **Node.js** (version 18 or newer) — Download from https://nodejs.org
- **npm** (comes with Node.js)
- A **PostgreSQL** database — for local dev you can use [Neon](https://neon.tech) (free cloud Postgres) or a local install. Prisma works with the connection string in `DATABASE_URL`.

### Step 2: Open your terminal/command prompt
- On Windows: Search for "PowerShell" and open it
- On Mac: Open "Terminal"
- On Linux: Open your terminal app

### Step 3: Navigate to the project folder
```bash
cd C:\Users\User\Documents\Projects\Eventicate
```
(Use the actual path where the project is saved.)

### Step 4: Install dependencies (frontend + backend)
```bash
npm install
cd backend
npm install
cd ..
```
This downloads all libraries into each app's `node_modules` folder.

### Step 5: Set up environment variables
There are two env files to create (copy the `.env.example` in each folder):

**Frontend** (`/.env`):
```bash
cp .env.example .env
```
Contains:
```
BACKEND_URL="http://localhost:3001"          # Where the backend runs
JWT_SECRET="change-this-to-a-secure-random-string"  # MUST match the backend
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Backend** (`backend/.env`):
```bash
cp .env.example .env
```
The important ones:
```
DATABASE_URL="postgresql://user:password@host/eventicate?sslmode=require"
JWT_SECRET="change-this-to-a-secure-random-string"   # MUST match the frontend
APP_URL="http://localhost:3000"
PORT=3001
```
The full template (email, Google OAuth, M-Pesa, Cloudinary) is documented in `backend/.env.example`.

### Step 6: Set up the database
```bash
cd backend
npm run db:push     # create/update tables from the schema
npm run db:seed     # optional: add demo accounts and sample data
```

### Step 7: Start the backend
```bash
npm run dev
```
The API listens on http://localhost:3001.

### Step 8: Start the frontend (new terminal)
```bash
npm run dev
```
You'll see output like:
```
▲ Next.js 15.x.x
- Local: http://localhost:3000
```

### Step 9: Open in your browser
Go to **http://localhost:3000**.

### Step 10: Stop the servers
Press `Ctrl + C` in each terminal.

---

## Demo accounts

All demo accounts use the password: `password123`

| Role | Email | What you can do |
|------|-------|-----------------|
| **Admin** | admin@eventicate.com | Manage everything — users, providers, complaints, subscription plans |
| **Customer** | customer@eventicate.com | Create events, book services, message providers |
| **PA Provider** | pa@soundpro.com | Manage PA/audio services, equipment, bookings |
| **Catering Provider** | catering@delight.com | Manage catering packages, menu items, bookings |
| **Venue Provider** | venue@grandhall.com | Manage venue listings, pricing, bookings |
| **Tents Provider** | tents@canopy.com | Manage tents/decoration services, bookings |

To register a new account, click "Get Started" in the top-right corner.

---

## Project structure explained

```
Eventicate/
│
├── .env                    # Frontend secrets (JWT secret, backend URL)
├── .env.example            # Frontend env template
├── package.json            # Frontend dependencies & scripts
├── next.config.ts          # Next.js config (proxies /api & /uploads to backend)
├── tsconfig.json           # TypeScript settings
│
├── backend/                # ★ THE API SERVER
│   ├── .env                # Backend secrets (DB URL, JWT, API keys)
│   ├── .env.example        # Backend env template (fully documented)
│   ├── package.json        # Backend dependencies & scripts
│   ├── prisma/
│   │   ├── schema.prisma   # ★ THE DATABASE SCHEMA — all tables & relations
│   │   ├── seed.ts         # Fills the DB with demo data
│   │   └── migrations/     # Versioned SQL migrations (applied via `db:migrate`)
│   ├── src/
│   │   ├── server.ts       # ★ App entry point — middleware, routes, graceful shutdown
│   │   ├── lib/            # Auth, email, payments, documents, pricing, rate limiting
│   │   └── routes/         # One file (or folder) per API area:
│   │       ├── auth/       # login, register, logout, session, google, forgot/reset password
│   │       ├── bookings/   # booking creation + status updates
│   │       ├── events/     # event CRUD
│   │       ├── payments/   # initiate, status, split, mpesa-callback, methods
│   │       ├── documents/  # quotes, invoices, agreements
│   │       ├── messages/   # chat, conversations, read receipts, WhatsApp mirror
│   │       ├── complaints.ts # customer/provider dispute submission + tracking
│   │       ├── notifications.ts # notification inbox, unread counts, mark read
│   │       ├── whatsapp.ts # WhatsApp Cloud API webhook (inbound)
│   │       ├── admin/      # users, providers (+ verification), complaints, plans, payments, whatsapp
│   │       ├── provider/   # settings, subscription, dashboard, verification, analytics
│   │       ├── customer/   # dashboard
│   │       ├── quotes/     # generate from cart
│   │       └── ...         # cart, packages, availability, timeline, budget, reviews, etc.
│   └── test/               # Backend unit tests
│
└── src/                    # ★ THE FRONTEND
    ├── app/
    │   ├── layout.tsx      # Root layout (<html>, <head>, <body>)
    │   ├── globals.css     # Global styles + color theme
    │   ├── page.tsx        # Homepage (/)
    │   ├── how-it-works/   # Info page
    │   ├── search/         # Find services
    │   ├── auth/           # Login, register, forgot-password, reset-password
    │   ├── dashboard/      # ★ CUSTOMER PORTAL (events, bookings, messages, documents, packages, budget, timeline, cart, checkout, agreements, complaints)
    │   ├── provider/       # ★ PROVIDER PORTAL (bookings, services, equipment, calendar, messages, reviews, documents, subscription, analytics, verification settings, local-sync)
    │   ├── admin/          # ★ ADMIN PORTAL (users, providers + verification, complaints, subscription-plans, branding, payments, whatsapp, locations)
    │   ├── notifications/  # ★ Notification inbox (bell in the sidebar for everyone)
    │   └── providers/[id]  # ★ PUBLIC provider profiles
    ├── components/
    │   ├── ui/             # Reusable UI (Button, Card, Input, Badge...)
    │   ├── layout/         # Navigation, sidebars
    │   ├── calendar/       # Availability calendar
    │   ├── auth/           # Login/register/reset forms
    │   ├── notifications/  # Bell + notifications list
    │   └── theme/          # Dark/light toggle
    ├── hooks/              # React hooks (e.g. useCurrency)
    └── lib/                # auth (JWT), utils, server-api (proxied fetch)
```

### How pages work (routing)

In Next.js, every folder inside `src/app` with a `page.tsx` file becomes a web page:

| Folder | URL |
|--------|-----|
| `src/app/page.tsx` | `/` (homepage) |
| `src/app/dashboard/page.tsx` | `/dashboard` |
| `src/app/dashboard/events/[id]/page.tsx` | `/dashboard/events/abc123` |
| `src/app/providers/[id]/page.tsx` | `/providers/xyz789` |

Folders in square brackets like `[id]` are **dynamic routes** — they match any value and pass it as a parameter.

### How API routes work

The frontend has **no API routes of its own**. The `next.config.ts` rewrites proxy `/api/*` and `/uploads/*` to the Express backend (default `http://localhost:3001`). All endpoints live in `backend/src/routes/`.

### Server vs Client Components

- **Server Components** (default) — Run on the server, send HTML to the browser. Used for pages that fetch data. Faster and more secure.
- **Client Components** — Have `"use client"` at the top. Run in the browser. Used for interactivity (forms, buttons, real-time updates).
- Most pages are server components that fetch data, with small client components embedded for interactive parts.

---

## How the database works

The database is defined in `backend/prisma/schema.prisma`. This file describes every table and how they relate to each other. Changes are captured as versioned SQL files in `backend/prisma/migrations/` (currently `0001`–`0011`; they apply automatically on every Render deploy).

### Money storage

All monetary columns (prices, amounts, budgets, charges, refunds) are stored as **exact decimal numbers** (`NUMERIC(12,2)`), not floats — so sums and tax/discount math never drift. A small middleware (`backend/src/lib/serialize.ts`) converts decimals back to plain numbers in every API response, so the frontend always receives normal numbers.

### Key concepts

- **Model** = A table in the database (like `User`, `Event`, `Booking`)
- **Field** = A column in a table (like `email`, `firstName`, `eventDate`)
- **Relation** = How tables connect (like "a User has one CustomerProfile" or "an Event has many Bookings")

### Main tables explained

```
User ───────────────────────── Has one → CustomerProfile
  │                                        │
  │                                        └── Has many → Events
  │                                                     │
  │                                                     └── Has many → Bookings
  │                                                                  │
  │                                                                  ├── Belongs to → Service
  │                                                                  ├── Has many → Payments
  │                                                                  ├── Has many → Messages
  │                                                                  ├── Has many → Reviews
  │                                                                  ├── Has one → AvailabilitySlot
  │                                                                  └── Has many → Documents/Agreements
  │
  └── Has one → ProviderProfile
                   │
                   ├── Has many → Services
                   ├── Has many → Equipment
                   ├── Has many → Vehicles
                   ├── Has many → Venues
                   ├── Has many → MenuPackages
                   ├── Has many → Bookings
                   ├── Has many → PricingRules
                   ├── Has many → AvailabilitySlots
                   ├── Has one → ProviderSubscription
                   └── Has one → LocalSyncConfig
```

### Important enums (fixed lists of options)

- **UserRole**: CUSTOMER, PROVIDER, ADMIN
- **EventType**: WEDDING, FUNERAL, BIRTHDAY, CORPORATE, CONCERT, CHURCH, GRADUATION, OTHER
- **ServiceCategory**: VENUE, PA_SYSTEM, CATERING, TENTS, TRANSPORT, PHOTOGRAPHY, VIDEOGRAPHY, DECORATION, ENTERTAINMENT, OTHER
- **BookingStatus**: QUOTATION_REQUESTED → QUOTATION_SENT → PENDING_APPROVAL → CONFIRMED → DEPOSIT_PAID → COMPLETED (or CANCELLED/REJECTED)
- **AvailabilityStatus**: AVAILABLE, PENDING, CONFIRMED, UNAVAILABLE
- **PaymentStatus**: PENDING, DEPOSIT_PAID, FULLY_PAID, REFUNDED, FAILED
- **PaymentMethod**: CARD, BANK_TRANSFER, CASH, MOBILE_MONEY, MPESA, PESAPAL
- **DocumentStatus**: DRAFT, SENT, ACCEPTED, REJECTED, PAID, OVERDUE, CANCELLED
- **DocumentType**: QUOTE, INVOICE, RECEIPT, PROFORMA_INVOICE, TAX_INVOICE, AGREEMENT
- **SubscriptionStatus**: TRIAL, ACTIVE, EXPIRED, CANCELLED, PAST_DUE

### How to view the database

```bash
cd backend
npx prisma studio
```
This opens Prisma Studio — a web interface where you can browse and edit all data visually. It opens at http://localhost:5555.

---

## How the booking flow works

The booking process has 8 defined statuses:

```
1. QUOTATION_REQUESTED  ← Customer requests a quote from a provider
        │
2. QUOTATION_SENT       ← Provider sends a quotation with pricing
        │
3. PENDING_APPROVAL     ← Customer reviews the quotation
        │
4. CONFIRMED            ← Customer accepts the quote (booking is confirmed)
        │
5. DEPOSIT_PAID         ← Customer pays the deposit
        │
6. COMPLETED            ← Event happened and provider marked it done
        │
   CANCELLED / REJECTED ← Either party can cancel at any point
```

Only legal transitions are allowed and each party can only move a booking along valid paths (e.g. a customer can't mark a booking complete).

At each step the system:
- **Reserves the date** on the provider's availability calendar atomically (prevents double-booking even under concurrency)
- **Sends notifications** and email to both parties
- **Generates documents** — quotes, invoices, receipts

---

## Payments (M-Pesa, cards, bank)

- **M-Pesa (Daraja STK Push)** — Customers enter a phone number and receive an STK push prompt on their phone. Sandbox and production environments are supported. Requires Daraja credentials in the admin Payment settings (or env vars).
- **PesaPal / Card / Bank transfer / Cash** — Supported as methods with split-payment support (deposit + balance).
- **Split payments** — A deposit (e.g. 30%) can be paid first; the remaining balance is tracked and can be paid later.
- **Callback verification** — The M-Pesa callback is idempotent (duplicate callbacks don't double-charge) and each payment has a unique `transactionId`.
- Payments are only counted as completed when they actually succeed — pending/failed payments never inflate "amount paid".

To configure M-Pesa for the platform, an admin goes to **Admin → Payments** and saves the consumer key, secret, passkey, and shortcode.

---

## Subscription & trial system

### How it works for providers

1. **Free trial**: A new provider gets a free trial (auto-started) and can use all features during it.
2. **Tiered plans**: After the trial, they need to choose a paid plan:

   | Plan | Price | Services | Equipment | Bookings/mo | Venues | Vehicles |
   |------|-------|----------|-----------|-------------|--------|----------|
   | **Free** | $0 | 5 | 10 | 25 | 1 | 1 |
   | **Basic** | $29 | 15 | 30 | 100 | 3 | 3 |
   | **Pro** | $79 | 50 | 100 | 500 | 10 | 10 |
   | **Enterprise** | $199 | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |

3. **Restrictions**: Only an **ACTIVE paid plan** unlocks full limits. If a provider tries to add more services/equipment than their plan allows, they'll get an error telling them to upgrade. Trials no longer "re-arm" forever — once used, the trial view returns to the paid-plan requirements.

### How to set up plans

1. Login as admin (admin@eventicate.com)
2. Go to `/admin/subscription-plans`
3. Create, edit, delete plans, and change prices/limits anytime

To disable the trial system temporarily, set `trialDays` to 0 on all plans.

---

## Invoices & quotes

### Auto-generation

The system automatically creates documents at key moments:
1. **Quote** — When a provider sends a quotation (sets a price on a booking request)
2. **Invoice / Proforma / Tax invoice** — When a customer accepts and payment is due
3. **Receipt** — When a payment is actually made

### Document numbers

Each document gets a unique number like `QTE-0001`, `INV-0001`, `RCT-0001`.

### Where to find them

- **Customers**: `/dashboard/documents`
- **Providers**: `/provider/documents`

### Actions you can take

- **View** the document as a nicely formatted page
- **Print** with your browser's Print function (Ctrl+P) — styled to print cleanly
- **Accept/reject** a quote (customer)
- **Mark as paid** — only the customer (or a confirmed payment) can mark a document paid; a provider can't self-certify
- **Cart to quote** — customers can turn their shopping cart into grouped quotes per provider

---

## Currencies & locations

- **Country-aware currency** — When a user logs in, their country determines the display currency:
  - Kenya → **KES** (Kenyan Shilling)
  - Uganda → **UGX** (Ugandan Shilling)
  - Tanzania → **TZS** (Tanzanian Shilling)
  - Everything else → **USD**
- Currencies are formatted automatically across every price display (dashboard, checkout, documents, search).
- **Location data** — Countries and subdivisions (regions/counties) are managed by admins under **Admin → Locations**, and providers select their location from these lists.

---

## Dark/Light theme

- **First visit**: Automatically follows your computer/phone's theme setting
- **Toggle**: Click the sun/moon/monitor icon to switch between 🌙 Dark, ☀️ Light, and 💻 System
- **Remembers**: Your choice persists even if you close your browser

The theme is stored in `localStorage` and applied before the page renders to avoid a flash of the wrong theme.

---

## Google login

### How to enable it
1. Go to https://console.cloud.google.com/apis/credentials
2. Create an OAuth 2.0 Client ID (choose "Web application")
3. Add your frontend URL + `/api/auth/google/callback` as an authorized redirect URI
4. Add the Client ID and Secret to `backend/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`)
5. Restart the backend

### How it works
- The login page shows a "Sign in with Google" button
- Clicking it takes you to Google's consent screen (protected with a CSRF state token)
- After authorization, Google redirects back — the app verifies the state token and that the email is Google-verified
- New users get an account automatically; existing users are logged in
- Google users have no password — they sign in with Google only

---

## WhatsApp messaging

Eventicate integrates with the **WhatsApp Business Cloud API** for two-way chat: messages sent in the app can also be delivered on WhatsApp, and replies that customers send to the business number arrive in the app.

### How to enable it
1. Create a Meta app with the **WhatsApp product** at https://developers.facebook.com (requires a WhatsApp Business Account and a Meta business verification).
2. As admin, go to **Admin → WhatsApp** and paste the four values:
   - **Access Token** — a permanent token from the Meta app
   - **Phone Number ID** — from the WhatsApp product settings
   - **Verify Token** — any random string you choose
   - **Business Phone** — the number people message (e.g. `254700000000`)
3. In the Meta app dashboard, set the webhook to the callback URL `https://<your-api-domain>/api/whatsapp/webhook` and enter the **same verify token**.
4. Save — the platform verifies the subscription automatically and starts receiving messages.

### How it works
- **Outbound** — Every message sent in the in-app chat is also sent over WhatsApp when configured. Each bubble shows the delivery status (sent / delivered / failed).
- **Inbound** — When someone WhatsApps the business number, the message is matched to the app user by phone number and appears in the chat, plus a notification and email are sent.
- **Demo** — The seeded demo accounts have phone numbers `+254700000001`–`+254700000006` assigned, so you can test with the WhatsApp Business sandbox.
- If WhatsApp isn't configured, in-app messaging still works normally — WhatsApp sending is skipped silently.

---

## API routes

All endpoints live in the backend (`backend/src/routes/`) and are proxied from the frontend via `/api/*`.

| Endpoint | Methods | What it does |
|----------|---------|-------------|
| `/api/auth/register` | POST | Create new account |
| `/api/auth/login` | POST | Sign in |
| `/api/auth/logout` | POST | Sign out |
| `/api/auth/session` | GET | Check if logged in |
| `/api/auth/google` | GET | Redirect to Google login |
| `/api/auth/google/callback` | GET | Handle Google's response |
| `/api/auth/forgot-password` | POST | Email a single-use password reset link (enumeration-safe) |
| `/api/auth/reset-password` | POST | Set a new password with a valid, unexpired reset token |
| `/api/events` | GET, POST | List/create events |
| `/api/events/[id]` | GET, PATCH, DELETE | View/update/delete event |
| `/api/bookings` | GET, POST | List/create bookings |
| `/api/bookings/[id]` | GET, PATCH | View/update booking (role-guarded status transitions) |
| `/api/packages` | POST | Create multi-provider package (atomic, race-free) |
| `/api/providers` | GET | Search providers |
| `/api/providers/[id]` | GET | Get provider profile |
| `/api/services` | GET, POST, PATCH, DELETE | Manage services |
| `/api/equipment` | GET, POST, PATCH, DELETE | Manage equipment |
| `/api/availability` | GET, POST | Manage availability calendar |
| `/api/cart` | GET, POST, DELETE | Shopping cart |
| `/api/cart/[id]` | PATCH, DELETE | Update/remove cart item |
| `/api/quotes/generate-from-cart` | POST | Turn cart into quotes |
| `/api/reviews` | GET, POST | Submit/view reviews |
| `/api/payments` | GET, POST | List/record payments (ownership-checked) |
| `/api/payments/initiate` | POST | Start an M-Pesa/PesaPal/card payment |
| `/api/payments/status` | GET | Poll a payment status (read-only) |
| `/api/payments/split` | POST | Pay the remaining balance of a split payment |
| `/api/payments/methods` | GET | Available payment methods |
| `/api/payments/mpesa-callback` | POST | M-Pesa STK push callback (idempotent) |
| `/api/documents` | GET, POST | List/create documents |
| `/api/documents/[id]` | GET, PATCH, DELETE | View/update/cancel document (state machine) |
| `/api/documents/generate` | POST | Auto-generate from booking |
| `/api/agreements` | POST | Customer signs a booking agreement (amount cross-checked) |
| `/api/messages` | GET, POST | Send/receive messages |
| `/api/messages/conversations` | GET | List conversations with participants and unread counts |
| `/api/messages/read` | POST | Mark a conversation's messages as read |
| `/api/messages/[conversationId]` | GET | Read a conversation (auto-marks as read) |
| `/api/messages/thread` | POST | Create a multi-provider group thread |
| `/api/messages/thread/[masterQuoteId]` | GET, POST | Read/send in a group thread |
| `/api/complaints` | GET, POST | Customer/provider complaints (list mine / submit with evidence) |
| `/api/notifications` | GET | List my notifications with unread count |
| `/api/notifications/unread-count` | GET | Unread notification count (for the bell) |
| `/api/notifications/:id` | PATCH | Mark one notification as read |
| `/api/notifications/read-all` | POST | Mark all my notifications as read |
| `/api/upload` | POST | Upload an image/document (Cloudinary; role-gated, `verification` + `complaints` folders) |
| `/api/whatsapp/webhook` | GET, POST | Meta verification handshake + inbound WhatsApp messages |
| `/api/admin` | GET, PATCH | Admin dashboard + approve providers |
| `/api/admin/users` | GET, PATCH | User management (paginated) |
| `/api/admin/providers` | GET, POST, PUT, PATCH, DELETE | List (with paid/active status + payment filter), create, edit, deactivate/reactivate, delete (blocked if bookings/services exist) |
| `/api/admin/providers/:id/verification` | PATCH | Admin review of provider verification documents (sets verified badge) |
| `/api/admin/complaints` | GET, PATCH | Complaint management (type/priority/evidence, resolution + optional refund) |
| `/api/admin/subscription-plans` | GET, POST, PATCH, DELETE | Plan management |
| `/api/admin/payments` | GET, PUT | Payment credentials/config |
| `/api/admin/whatsapp` | GET, PUT | Read/update WhatsApp Cloud API credentials (masked) |
| `/api/admin/logos` | GET, PUT | Branding/logos |
| `/api/provider/settings` | GET, PATCH | Provider profile settings |
| `/api/provider/subscription` | GET, POST | Provider subscription |
| `/api/provider/subscription/check` | GET | Check plan limits |
| `/api/provider/dashboard` | GET | Provider dashboard stats |
| `/api/provider/verification` | POST | Submit provider verification documents (ID / business registration) |
| `/api/provider/analytics` | GET | Revenue over time, bookings by status, top services |
| `/api/customer/dashboard` | GET | Customer dashboard stats |
| `/api/budget` | GET | Get cost estimates |
| `/api/timeline` | GET, POST | Save/load event timeline |
| `/api/local-sync` | GET, POST, PUT | Local system integration |
| `/api/locations/...` | GET, POST, PUT, DELETE | Countries & subdivisions |

---

## Deployment

The app is deployed as two services:

| Part | Host | Folder | Notes |
|------|------|--------|-------|
| Frontend | **Vercel** | project root | `vercel.json` sets build/install commands |
| Backend | **Render** | `backend/` | `render.yaml` defines the service |

### Backend (Render)
- `render.yaml` at the repo root defines the `eventicate-api` service.
- The build runs `npm ci && node scripts/migrate-retry.mjs && npm run build` (migrations are retried so transient Neon connection issues don't strand old code).
- **Secrets are managed in the Render dashboard**, not committed — the DB URL, JWT secret, and Cloudinary credentials are marked `sync: false` in `render.yaml`. Set them in Dashboard → Environment before first deploy.
- WhatsApp credentials are **not** env vars — they're stored in the database and set by an admin under **Admin → WhatsApp**. Just make sure the webhook URL (`/api/whatsapp/webhook`) is HTTPS.

### Frontend (Vercel)
- `next.config.ts` proxies `/api` and `/uploads` to the backend via `BACKEND_URL`.
- The frontend needs `JWT_SECRET` (must match the backend's, so server components can verify the session cookie) and `NEXT_PUBLIC_APP_URL`.
- Any `eventicate-*.vercel.app` preview deployment is automatically allowed by the backend's CORS config.

---

## How to customize

### Changing colors
Edit `src/app/globals.css` — the `@theme` section defines the color palette:
```css
@theme {
  --color-primary-50: #fdf4ff;  /* Lightest purple */
  --color-primary-600: #c026d3; /* Main purple */
  --color-primary-900: #701a75; /* Darkest purple */
}
```

### Adding new features
1. Add database tables in `backend/prisma/schema.prisma`
2. Create a migration: `cd backend && npm run db:migrate` (or `npm run db:push` during development)
3. Add API routes in `backend/src/routes/`
4. Create pages in the appropriate `src/app/` folder
5. Add navigation links in `src/components/layout/Navigation.tsx`

### Useful scripts
Frontend (root):
```bash
npm run dev       # start dev server
npm run build     # production build
npm run start     # run production build
npm run lint      # lint
```

Backend (`backend/`):
```bash
npm run dev        # start dev API (tsx watch)
npm run typecheck  # type-check the whole backend
npm run test       # run unit tests
npm run build      # compile to dist/
npm run db:push    # apply schema to DB (dev)
npm run db:migrate # apply migration files (production)
npm run db:seed    # insert demo data
```

---

## Security notes

The project applies common security best practices:
- **Ownership checks** on every data access (you can only read/modify your own bookings, payments, documents, threads)
- **Role guards** on every route (CUSTOMER vs PROVIDER vs ADMIN)
- **Booking state machines** — only legal status transitions, per role
- **Idempotent payment callbacks** + unique transaction IDs to prevent double-charging
- **Atomic availability reservation** to prevent double-booking under concurrency
- **JWT sessions** with httpOnly cookies; passwords hashed with bcrypt
- **Rate limiting** on auth, uploads, payments, and globally
- **Helmet** security headers, CORS allow-list (incl. preview deployments)
- **Google OAuth CSRF state** and verified-email enforcement
- **Password reset** — reset tokens are hashed in the DB (never stored raw), single-use, expire after 1 hour, and the "forgot password" endpoint doesn't reveal whether an email exists
- **WhatsApp webhook** verify-token handshake (requests with a wrong token are rejected)
- **Input validation** with Zod everywhere
- **Secrets are not committed** — they live in the hosting dashboards (Render/Vercel)
- **Notification ownership** — you can only read/mark your own notifications

---

## Need help?

- Check Prisma Studio: `cd backend && npx prisma studio`
- Check the browser's DevTools console (F12) for errors
- The backend terminal shows server-side errors
- Search the codebase for specific terms using your editor's search

---

## License

Private project — All rights reserved.