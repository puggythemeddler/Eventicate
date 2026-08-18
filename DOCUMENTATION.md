# Eventicate — Complete System Documentation

> **Full-Stack Event Management Marketplace Platform**
>
> Version 1.0.0 | Last Updated: August 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Installation & Setup Guide](#4-installation--setup-guide)
5. [How to Host / Deploy](#5-how-to-host--deploy)
6. [File & Folder Structure](#6-file--folder-structure)
7. [User Roles & Permissions](#7-user-roles--permissions)
8. [Customer Manual](#8-customer-manual)
9. [Provider Manual](#9-provider-manual)
10. [Admin Manual](#10-admin-manual)
11. [Feature Catalog](#11-feature-catalog)
12. [Customization Guide](#12-customization-guide)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. System Overview

### What is Eventicate?

Eventicate is a **web-based marketplace** that connects people who are planning events (weddings, birthdays, corporate events, funerals, concerts, etc.) with businesses that provide event services (venues, catering, sound systems, photography, transport, decoration, entertainment, etc.).

Think of it like **Uber for event services** — one platform where:

- **Customers** can plan an entire event, find providers, compare prices, book services, make payments, and manage everything from one dashboard.
- **Service Providers** can list their services, manage their inventory, set their availability, receive booking requests, send quotations, and grow their business.
- **Administrators** can manage the platform — approve providers, handle complaints, set subscription prices, and view analytics.

### What can you do with it?

| If you are a... | You can... |
|----------------|-----------|
| **Customer** | Create events, search for providers, compare prices, request quotes, book services, pay deposits, message providers, rate services, view invoices |
| **Provider** | Create a business profile, manage services/equipment, set availability, receive booking requests, send quotes, get paid, manage inventory |
| **Admin** | Manage users, approve/reject providers, set subscription plans, handle complaints, upload branding logos, view platform analytics |

---

## 2. Technology Stack

This section explains every technology used to build Eventicate, from the programming language down to the database.

### Programming Languages

| Language | What it's used for | File extensions |
|----------|-------------------|-----------------|
| **TypeScript** | The main language for ALL code — both frontend and backend | `.ts`, `.tsx` |
| **JavaScript** | Used via TypeScript (which compiles to it) and in small config/script files | `.js`, `.mjs`, `.cjs` |
| **CSS** | Styling and layout of web pages | `.css` (in globals.css and Tailwind classes) |
| **SQL** | Database queries (handled automatically by Prisma — you don't write SQL directly) | `.prisma` (schema), SQL in migrations |
| **HTML/JSX** | The markup that makes up pages and components (JSX is TypeScript's HTML-like syntax in React) | `.tsx` |

### Frontend (What users see in their browser)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15 | The framework that runs the website — pages, routing, server rendering |
| **React** | 19 | A library for building user interface components (buttons, forms, cards, etc.) |
| **Tailwind CSS** | 4 | A styling system that lets you add visual design by writing class names directly in your code (e.g., `bg-blue-500` makes a blue background, `text-lg` makes text larger) |
| **Lucide React** | Latest | A collection of icons (calendar, search, settings, etc.) used throughout the interface |
| **Zod** | 3 | Validates data (also used on the backend) |
| **Jose** | Latest | Creates and verifies the JWT session token |

### Backend (The server that processes data)

The backend is a **separate Express API** in the `backend/` folder. The Next.js frontend proxies all `/api/*` and `/uploads/*` requests to it.

| Technology | Purpose |
|-----------|---------|
| **Express 5** | The web server framework that handles the REST API |
| **Prisma ORM** | A tool that lets you work with the database using TypeScript. You define the database structure in `prisma/schema.prisma` and Prisma generates the code to query it |
| **Jose** | Creates and verifies JSON Web Tokens (JWTs) — these are like digital ID cards that prove a user is logged in |
| **Bcryptjs** | Scrambles (hashes) passwords so they can't be read even if the database is stolen |
| **Zod** | Validates data — checks that API requests have the correct format before processing them |
| **Nodemailer** | Sends notification emails (quotes, invoices, welcome) |
| **WhatsApp Cloud API** | Two-way WhatsApp messaging — outbound send + inbound webhook (`backend/src/lib/whatsapp.ts`, `backend/src/routes/whatsapp.ts`) |
| **Multer + Cloudinary** | Handles file uploads and cloud image storage |
| **express-rate-limit** | Throttles requests to protect against abuse |
| **Helmet** | Sets security HTTP headers |

### Database

| Database | When to use | Where configured |
|----------|------------|------|
| **PostgreSQL** | Development AND production | `DATABASE_URL` in `backend/.env` (e.g. Neon cloud Postgres) |

### Hosting / Deployment

| Service | What it runs | Notes |
|---------|-------------|-------|
| **Vercel** | Frontend (Next.js) | `/api` and `/uploads` are proxied to the backend |
| **Render** | Backend (Express API) | Defined by `render.yaml`; migrations run on build |
| **Neon** | PostgreSQL database | Cloud-hosted Postgres |

---

## 3. System Architecture

### How data flows

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S BROWSER                           │
│  (Chrome, Firefox, Edge, Safari, Phone browser)             │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages   │  │  Forms   │  │  Buttons │  │  Icons   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │  HTTPS (secure internet connection)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  NEXT.JS FRONTEND (Vercel)                  │
│                                                             │
│  ┌─────────────────────┐        ┌──────────────────────┐    │
│  │   React Components  │        │   Server Components  │    │
│  │   (what renders)    │        │  (fetch data / auth) │    │
│  └─────────┬───────────┘        └──────────┬───────────┘    │
│            └──────────────┬────────────────┘                │
│                     proxies /api/* & /uploads/*             │
└───────────────────────────┼────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                EXPRESS API BACKEND (Render)                 │
│              ┌──────────────────────────────┐               │
│              │  Auth · Bookings · Payments  │               │
│              │  Documents · Messages · etc. │               │
│              └──────────────┬───────────────┘               │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼
              ┌─────────────────────────────┐
              │        PRISMA ORM            │
              │  (Database query builder)    │
              └─────────────┬───────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │         POSTGRESQL          │
              │  Tables: Users, Events,     │
              │  Bookings, Payments, etc.   │
              └─────────────────────────────┘
```

### How pages become URLs

In Next.js, the folder structure inside `src/app/` determines the website URLs. Every folder with a `page.tsx` file becomes a page:

```
src/app/
├── page.tsx                    →  /                     (Homepage)
├── how-it-works/
│   └── page.tsx                →  /how-it-works         (Info page)
├── search/
│   └── page.tsx                →  /search               (Find services)
├── auth/
│   ├── login/page.tsx          →  /auth/login           (Sign in)
│   └── register/page.tsx       →  /auth/register        (Sign up)
├── dashboard/
│   ├── page.tsx                →  /dashboard            (Customer home)
│   ├── events/
│   │   ├── page.tsx            →  /dashboard/events     (My events list)
│   │   ├── [id]/page.tsx       →  /dashboard/events/abc (Single event)
│   │   └── new/page.tsx        →  /dashboard/events/new (Create event)
│   ├── bookings/
│   │   ├── page.tsx            →  /dashboard/bookings   (Bookings list)
│   │   ├── [id]/page.tsx       →  /dashboard/bookings/abc
│   │   └── new/page.tsx        →  /dashboard/bookings/new
│   ├── cart/page.tsx           →  /dashboard/cart      (Shopping cart)
│   ├── checkout/[bookingId]/page.tsx → /dashboard/checkout/abc (Pay for a booking)
│   ├── agreements/[bookingId]/page.tsx → /dashboard/agreements/abc (Sign an agreement)
│   ├── messages/page.tsx       →  /dashboard/messages
│   ├── documents/
│   │   ├── page.tsx            →  /dashboard/documents  (Invoices & quotes)
│   │   └── [id]/page.tsx       →  /dashboard/documents/abc
│   ├── packages/page.tsx       →  /dashboard/packages   (Package builder)
│   ├── budget/page.tsx         →  /dashboard/budget     (Budget calculator)
│   └── timeline/page.tsx       →  /dashboard/timeline   (Timeline planner)
│   ├── provider/
│   │   ├── page.tsx                →  /provider             (Provider home)
│   │   ├── bookings/
│   │   │   └── ...                 →  /provider/bookings/...
│   │   ├── services/page.tsx       →  /provider/services
│   │   ├── equipment/page.tsx      →  /provider/equipment
│   │   ├── calendar/page.tsx       →  /provider/calendar
│   │   ├── messages/page.tsx       →  /provider/messages
│   │   ├── reviews/page.tsx        →  /provider/reviews
│   │   ├── documents/
│   │   │   └── ...                 →  /provider/documents/...
│   │   ├── subscription/page.tsx   →  /provider/subscription
│   │   ├── settings/page.tsx       →  /provider/settings
│   │   └── local-sync/page.tsx     →  /provider/local-sync
│   ├── admin/
│   │   ├── page.tsx                →  /admin                (Admin home)
│   │   ├── users/page.tsx          →  /admin/users
│   │   ├── providers/page.tsx      →  /admin/providers
│   │   ├── complaints/page.tsx     →  /admin/complaints
│   │   ├── subscription-plans/     →  /admin/subscription-plans
│   │   │   └── page.tsx
│   │   ├── branding/page.tsx       →  /admin/branding       (Logo upload)
│   │   ├── payments/page.tsx       →  /admin/payments       (M-Pesa credentials)
│   │   ├── whatsapp/page.tsx       →  /admin/whatsapp       (WhatsApp credentials)
│   │   └── locations/page.tsx      →  /admin/locations      (Countries & subdivisions)
└── providers/
    └── [id]/page.tsx           →  /providers/abc        (Public profile)
```

The `[id]` pattern means the URL accepts any value — that value becomes available as a parameter in the code. For example, visiting `/providers/xyz123` makes `id = "xyz123"` available.

---

## 4. Installation & Setup Guide

### Step 1: Prerequisites

Install these on your computer:

| Software | Version | Download from | Why you need it |
|----------|---------|--------------|-----------------|
| **Node.js** | 18 or newer | https://nodejs.org | Runs JavaScript on your computer |
| **npm** | Comes with Node.js | (included) | Installs project libraries |
| **Git** (optional) | Latest | https://git-scm.com | Version control |
| **Code Editor** | Any | https://code.visualstudio.com | To edit code (VS Code recommended) |

### Step 2: Get the project files

If you have the project as a ZIP file:
1. Extract the ZIP to a folder (e.g., `C:\Projects\Eventicate`)
2. Open that folder

If using Git:
```bash
git clone <repository-url>
cd Eventicate
```

### Step 3: Install dependencies (frontend + backend)

The project has **two apps** — the frontend (project root) and the backend (`backend/`). Install dependencies in both:

```bash
npm install
cd backend
npm install
cd ..
```

This downloads all the libraries each app needs (React, Next.js, Prisma, Express, etc.) into their `node_modules` folders. This may take 1-3 minutes depending on your internet speed.

### Step 4: Configure environment

There are **two** env files to create (copy the `.env.example` from each folder):

**Frontend** (`/.env`):
```bash
cp .env.example .env
```

**Backend** (`backend/.env`):
```bash
cd backend
cp .env.example .env
cd ..
```

The frontend `.env` needs:
```
BACKEND_URL="http://localhost:3001"          # Where the backend runs
JWT_SECRET="change-this-to-a-secure-random-string"  # MUST match the backend
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

The backend `.env` needs a `DATABASE_URL` (PostgreSQL connection string) plus the same `JWT_SECRET` value. All backend options are documented in `backend/.env.example`.

### Step 5: Set up the database

```bash
cd backend
npm run db:push
```

This creates all the database tables based on the schema in `prisma/schema.prisma`. You should see output like "Your database is now in sync with your schema."

### Step 6: Add demo data (recommended)

```bash
npm run db:seed
```

This fills the database with sample data so you can immediately test the system:

- **6 user accounts** (admin, customer, PA provider, catering provider, venue provider, tents provider)
- **Sample services, equipment, menu packages**
- **Dynamic pricing rules**
- **A sample wedding event with a booking**
- **Default subscription plans** (Free, Basic, Pro, Enterprise)

### Step 7: Start the backend

```bash
npm run dev
```
The API listens on http://localhost:3001.

### Step 8: Start the frontend (new terminal, in the project root)

```bash
npm run dev
```

You should see:
```
▲ Next.js 15.x.x
- Local: http://localhost:3000
```

### Step 9: Open in your browser

Go to **http://localhost:3000** in your web browser.

### Step 10: Stop the servers

Press `Ctrl + C` in each terminal.

### Quick Reference: All npm Commands

Frontend (project root):

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start the frontend dev server |
| `npm run build` | Build the frontend for production |
| `npm run start` | Start the production frontend (after build) |
| `npm run lint` | Check code for errors |

Backend (`backend/`):

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start the API dev server (tsx watch) |
| `npm run typecheck` | Type-check the whole backend |
| `npm run test` | Run backend unit tests |
| `npm run build` | Compile the backend to `dist/` |
| `npm run start` | Run the compiled backend |
| `npm run db:push` | Update database with latest schema (dev) |
| `npm run db:migrate` | Apply migration files (production) |
| `npm run db:seed` | Fill database with demo data |
| `npx prisma studio` | Open Prisma Studio (visual database browser) |

---

## 5. How to Host / Deploy

The app is deployed as **two services**: the frontend on Vercel and the backend on Render, with PostgreSQL on Neon. See `DEPLOY.md` for the full step-by-step.

### Option A: Deploy to Vercel (Frontend) + Render (Backend) — Recommended

**Backend (Render):**
1. Push your code to GitHub
2. In Render, click **"New" → "Blueprint"** and pick your repo — it reads `render.yaml` (defines the `eventicate-api` service, build + start commands)
3. Set the environment variables in the Render dashboard (Settings → Environment). Secrets (DB URL, JWT secret, Cloudinary, M-Pesa) are NOT committed to the repo — they're marked `sync: false` in `render.yaml`, so set them in the dashboard:
   - `DATABASE_URL` / `DATABASE_URL_DIRECT` → your Neon Postgres connection strings
   - `JWT_SECRET` → a random string (must match the frontend)
   - `APP_URL`, `NEXT_PUBLIC_APP_URL` → your frontend domain
   - `MPESA_*`, `SMTP_*`, `GOOGLE_*`, `CLOUDINARY_*` → as needed
4. Deploy. Migrations run automatically during the build (`node scripts/migrate-retry.mjs`). Seed once from the Render shell: `npm run db:seed`

**Frontend (Vercel):**
1. In Vercel, click **"Add New" → "Project"** and import the same repo (framework auto-detects Next.js)
2. Set environment variables:
   - `BACKEND_URL` → your Render backend URL (e.g. `https://eventicate-api.onrender.com`)
   - `JWT_SECRET` → **identical** to the backend's
   - `NEXT_PUBLIC_APP_URL` → your domain
3. Deploy. `/api/*` and `/uploads/*` are automatically proxied to the backend by `next.config.ts`

### Option B: Manual Server Deployment (DigitalOcean, AWS, etc.)

You'd run the Express backend on the server and point the frontend at it:

1. **Build the backend:**
   ```bash
   cd backend
   npm run build
   ```

2. **Set up PostgreSQL** (or use a managed service like Neon)

3. **Set environment variables** (backend):
   ```
   DATABASE_URL="postgresql://user:password@host:5432/database"
   JWT_SECRET="your-random-secret-key"
   APP_URL="https://yourdomain.com"
   ```

4. **Run database migrations:**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start the server:**
   ```bash
   npm run start
   ```

6. **Use a process manager** (like PM2) to keep it running:
   ```bash
   npm install -g pm2
   pm2 start npm --name "eventicate-api" -- start
   pm2 save
   pm2 startup
   ```

7. **Set up a reverse proxy** with Nginx to handle SSL (HTTPS) and domain routing.

### Option C: Local Network / Intranet

If you want to run it on your local network:

1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `npm run dev` (in the project root)
3. Find your local IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
4. Access from other devices: `http://YOUR_IP:3000`
5. For permanent local use, use the production builds.

### Production Checklist

Before going live, make sure to:

- [ ] **Change JWT_SECRET** to a strong random value (identical on frontend + backend)
- [ ] **Use PostgreSQL** (Neon or similar)
- [ ] **Set up HTTPS/SSL** (Vercel/Render do this automatically)
- [ ] **Configure Google OAuth** (if using Google login)
- [ ] **Upload your brand logos** via `/admin/branding`
- [ ] **Set M-Pesa credentials** via `/admin/payments` (needs a Daraja sandbox account first)
- [ ] **Connect WhatsApp** via `/admin/whatsapp` + set the webhook in Meta (optional, enables two-way chat)
- [ ] **Review subscription plan pricing** at `/admin/subscription-plans`
- [ ] **Test all user flows** before announcing the platform
- [ ] **Set up regular database backups**

---

## 6. File & Folder Structure

### Top-level files

```
Eventicate/
│
├── .env                        # SECRET — frontend env (JWT secret, backend URL)
├── .env.example                # Frontend env template
├── .gitignore                  # Files Git should ignore (node_modules, .env, etc.)
├── package.json                # Frontend project info, dependencies, and commands
├── package-lock.json           # Auto-generated — locks frontend dependency versions
├── next.config.ts              # Next.js settings (proxies /api & /uploads to backend)
├── tsconfig.json               # TypeScript settings
├── vercel.json                 # Vercel deploy config
├── render.yaml                 # Render backend blueprint (env config, build/start)
├── README.md                   # Project overview
├── DEPLOY.md                   # Deployment guide
├── DOCUMENTATION.md            # This documentation!
│
└── backend/                    # ★ THE API SERVER (Express + Prisma)
    ├── .env                    # SECRET — DB URL, JWT secret, API keys
    ├── .env.example            # Backend env template (fully documented)
    ├── package.json            # Backend dependencies & scripts
    ├── prisma/                 # Schema, seed, and migration files
    ├── src/                    # server.ts, lib/, routes/
    ├── scripts/                # migrate-retry.mjs (used by Render build)
    └── test/                   # Backend unit tests
```

### Source code — frontend (`src/`)

```
src/
│
├── app/                        # ★ ALL PAGES (this is where the website lives)
│   │
│   ├── layout.tsx              # Root layout — wraps every page (has <html>, <head>)
│   ├── globals.css             # Global styles — colors, fonts, backgrounds
│   ├── page.tsx                # Homepage (/)
│   │
│   ├── auth/                   # ★ PUBLIC PAGES
│   │   ├── login/page.tsx      #   Sign in (/auth/login)
│   │   └── register/page.tsx   #   Sign up (/auth/register)
│   │
│   ├── dashboard/              # ★ CUSTOMER PORTAL
│   │   ├── page.tsx            #   Dashboard home
│   │   ├── events/             #   Event management
│   │   ├── bookings/           #   Booking management
│   │   ├── cart/               #   Shopping cart
│   │   ├── checkout/           #   Payment checkout
│   │   ├── agreements/         #   Electronic agreements
│   │   ├── messages/           #   Chat with providers
│   │   ├── documents/          #   Quotes and invoices
│   │   ├── packages/           #   Package builder
│   │   ├── budget/             #   Budget calculator
│   │   └── timeline/           #   Timeline planner
│   │
│   ├── provider/               # ★ PROVIDER PORTAL
│   │   ├── page.tsx            #   Provider dashboard
│   │   ├── bookings/           #   Booking management
│   │   ├── services/           #   Service listings
│   │   ├── equipment/          #   Equipment inventory
│   │   ├── calendar/           #   Availability calendar
│   │   ├── messages/           #   Chat with customers
│   │   ├── reviews/            #   Reviews
│   │   ├── documents/          #   Quotes and invoices
│   │   ├── subscription/       #   Subscription & billing
│   │   ├── settings/           #   Profile settings
│   │   └── local-sync/         #   Local system integration
│   │
│   ├── admin/                  # ★ ADMIN PORTAL
│   │   ├── page.tsx            #   Admin dashboard
│   │   ├── users/              #   User management
│   │   ├── providers/          #   Provider management
│   │   ├── complaints/         #   Complaint handling
│   │   ├── subscription-plans/ #   Pricing plans
│   │   ├── branding/           #   Logo upload
│   │   ├── payments/           #   M-Pesa credentials
│   │   └── locations/          #   Countries & subdivisions
│   │
│   ├── providers/              # ★ PUBLIC PROVIDER PROFILES
│   │   └── [id]/page.tsx       #   Anyone can view provider profiles
│   │
│   ├── search/page.tsx         # ★ PUBLIC SERVICE SEARCH
│   └── how-it-works/page.tsx   # ★ PUBLIC INFO PAGE
│
├── components/                 # ★ REUSABLE COMPONENTS
│   ├── ui/                     #   Basic building blocks
│   │   ├── Button.tsx          #   Buttons (primary, secondary, outline, danger)
│   │   ├── Card.tsx            #   Cards (containers with border/shadow)
│   │   ├── Input.tsx           #   Input fields, dropdowns, textareas
│   │   └── Badge.tsx           #   Status labels, star ratings
│   ├── layout/                 #   Navigation & layout
│   │   └── Navigation.tsx      #   Sidebar, public header, category icons
│   ├── auth/                   #   Login & registration forms
│   ├── calendar/               #   Availability calendar widget
│   ├── theme/                  #   Dark/light theme toggle
│   └── documents/              #   Invoice/quote display & print
│
├── hooks/                      # ★ REACT HOOKS
│   └── useCurrency.ts          #   Country-aware currency formatting
│
└── lib/                        # ★ HELPER FUNCTIONS
    ├── auth.ts                 #   JWT token verification (server components)
    ├── server-api.ts           #   Server-side fetch proxied to the backend
    ├── utils.ts                #   Format dates, currency, JSON helpers
    └── ...                     #   constants, theme-config
```

### Backend source code (`backend/src/`)

```
backend/src/
├── server.ts                   # ★ App entry — middleware, routes, graceful shutdown
├── lib/                        # ★ Helper modules
│   ├── auth.ts                 #   Password hashing, JWT tokens, session cookies
│   ├── prisma.ts               #   Database connection (singleton)
│   ├── booking-engine.ts       #   Price calculation, availability, notifications
│   ├── documents.ts            #   Invoice/quote generation
│   ├── subscription.ts         #   Plan limits, trial management
│   ├── payments.ts             #   M-Pesa / PesaPal / Stripe gateway helpers
│   ├── mpesa.ts                #   Daraja STK push integration
│   ├── email.ts                #   Nodemailer senders
│   ├── cloudinary.ts           #   Image upload helper
│   ├── google-auth.ts          #   Google OAuth configuration + state tokens
│   ├── rate-limit.ts           #   express-rate-limit instances
│   └── utils.ts                #   Formatting / parsing helpers
└── routes/                     # ★ One file (or folder) per API area
    ├── auth/                   #   login, register, logout, session, google
    ├── bookings/               #   booking creation + status updates
    ├── events/                 #   event CRUD
    ├── payments/               #   initiate, status, split, mpesa-callback, methods
    ├── documents/              #   quotes, invoices, generate
    ├── messages/               #   chat + multi-provider threads
    ├── admin/                  #   users, providers, complaints, plans, payments, logos
    ├── provider/               #   settings, subscription, dashboard
    ├── customer/               #   dashboard
    ├── quotes/                 #   generate-from-cart
    └── ...                     #   cart, packages, availability, timeline, budget, reviews, upload, locations, local-sync
```

### Database & config (`backend/prisma/`)

```
backend/prisma/
├── schema.prisma               # ★ THE DATABASE SCHEMA
│                               #   Defines every table, their fields,
│                               #   and how they relate to each other
├── seed.ts                     # Demo data script
└── migrations/                 # Versioned SQL migrations (0001_init, 0002, 0003...)
```

---

## 7. User Roles & Permissions

### The three roles

```
┌─────────────────────────────────────────────────────┐
│                   EVERYONE                            │
│  (Can view: Homepage, Search, Provider Profiles)      │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  CUSTOMER    │  │  PROVIDER    │  │  ADMIN     │ │
│  │              │  │              │  │            │ │
│  │ • Create     │  │ • Manage     │  │ • Manage   │ │
│  │   events     │  │   services   │  │   users    │ │
│  │ • Search     │  │ • Manage     │  │ • Approve  │ │
│  │   providers  │  │   inventory  │  │   providers│ │
│  │ • Book       │  │ • Set        │  │ • Set      │ │
│  │   services   │  │   prices     │  │   pricing  │ │
│  │ • Pay        │  │ • Get        │  │ • Handle   │ │
│  │ • Message    │  │   bookings   │  │   complaints│ │
│  │ • Review     │  │ • Message    │  │ • Upload   │ │
│  │              │  │ • Review     │  │   logos    │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

### What each role can access

| Page | Public | Customer | Provider | Admin |
|------|--------|----------|----------|-------|
| Homepage (`/`) | ✅ | ✅ | ✅ | ✅ |
| Search (`/search`) | ✅ | ✅ | ✅ | ✅ |
| Provider Profiles (`/providers/*`) | ✅ | ✅ | ✅ | ✅ |
| How It Works (`/how-it-works`) | ✅ | ✅ | ✅ | ✅ |
| Login/Register | ✅ | ❌ (redirects) | ❌ | ❌ |
| Customer Dashboard (`/dashboard/*`) | ❌ | ✅ | ❌ | ❌ |
| Provider Dashboard (`/provider/*`) | ❌ | ❌ | ✅ | ❌ |
| Admin Dashboard (`/admin/*`) | ❌ | ❌ | ❌ | ✅ |

---

## 8. Customer Manual

### 8.1 Creating an Account

1. Click **"Get Started"** in the top-right corner
2. Fill in your details (name, email, password)
3. Select **"Customer / Event Organizer"** as account type
4. Click **"Create Account"**
5. You'll be taken to your dashboard

**Or sign in with Google** — Click "Sign in with Google" on the login page (must be configured in `.env` first).

### 8.2 Your Dashboard

When you log in, you land on `/dashboard`. This shows:

- **Upcoming Events** — Count of events you've created
- **Active Bookings** — Count of your current bookings
- **Find Services** — Quick link to search providers
- **My Events** — List of your recent events (click to view details)
- **Recent Bookings** — Your recent booking activity

### 8.3 Creating an Event

1. Click **"Create Event"** on your dashboard (or go to `/dashboard/events/new`)
2. Fill in the form:
   - **Event Title** — e.g., "Sarah & John's Wedding"
   - **Event Type** — Wedding, Birthday, Corporate, Funeral, etc.
   - **Event Date** — When it's happening
   - **End Date** — (optional) If multi-day
   - **Location** — Where the event will be
   - **Expected Guests** — How many people
   - **Budget** — Minimum and maximum budget (optional)
   - **Description** — Any extra details
   - **Required Services** — What kind of services you need (venue, catering, PA, etc.)
3. Click **"Create Event"**
4. You'll be taken to the event detail page

### 8.4 Viewing Your Events

Go to `/dashboard/events` to see all your events. You can:

- Filter by event type (Wedding, Birthday, etc.)
- Search by event title
- Click any event to view details

### 8.5 Finding Providers

1. Go to **"Find Services"** in the sidebar (or `/search`)
2. Use the filters:
   - **Search** — Type keywords (e.g., "sound", "catering")
   - **Category** — Select a service type (Venue, PA/Audio, Catering, etc.)
   - **City** — Filter by location
3. Browse provider cards showing:
   - Business name and description
   - Service category
   - Star rating
   - Starting price
4. Click a provider to see their full profile

### 8.6 Viewing a Provider Profile

A provider profile (`/providers/[id]`) shows:

- **About section** — Description of the business
- **Services** — What they offer with prices
- **Catering Packages** — If they're a caterer, menu options with per-guest pricing
- **Equipment** — If they rent equipment, what's available
- **Dynamic Pricing** — Special pricing for different event types
- **Reviews** — What other customers have said
- **Availability Calendar** — Their booked and available dates (green = available, yellow = pending, red = booked)

### 8.7 Requesting a Quotation

1. Go to a provider's profile
2. Click **"Request Quotation"**
3. Select an **Event** (one you've created)
4. Optionally select a **Service** they offer
5. Add any notes
6. Click **"Request Quotation"**

### 8.8 Managing Bookings

Go to `/dashboard/bookings` to see all your bookings.

Booking statuses and what they mean:

| Status | What it means |
|--------|---------------|
| **Quotation Requested** | You asked for a price — waiting for provider |
| **Quotation Sent** | Provider sent you a price — review it |
| **Pending Approval** | You need to accept or reject the quote |
| **Confirmed** | Booking is confirmed |
| **Deposit Paid** | You've paid the deposit |
| **Completed** | Event happened and is done |
| **Cancelled** | Was cancelled |
| **Rejected** | Provider couldn't fulfill it |

On a booking detail page (`/dashboard/bookings/[id]`), you can:

- View the quotation details
- **Accept** or **Reject** a quote
- **Message** the provider
- See **payment history**
- See your **messages** with the provider

### 8.9 Making a Payment

Once a quote is accepted and confirmed:

1. Go to the booking detail page
2. Click **"Make Payment"** (marked as deposit or full)
3. Choose payment method (M-Pesa, PesaPal, Card, Bank Transfer, Cash)
4. For **M-Pesa**, enter your phone number — you'll receive an STK push prompt to approve
5. For bank/card, follow the checkout flow
6. Once confirmed, the system records the payment and generates a receipt automatically

### 8.10 Messaging Providers

Go to `/dashboard/messages` to chat with your providers.

- Conversations are listed on the left, with **unread badges** on conversations you haven't opened
- Opening a conversation marks it as read, so badges clear automatically
- Type your message and press **Enter** to send (Shift+Enter for a new line)
- Attach files — images, PDFs, and Word documents are supported
- Click **Continue on WhatsApp** to jump out to WhatsApp with that provider (works even without the platform WhatsApp connection)
- For multi-provider quotes (from the Package Builder or cart), you'll have a **group thread** with all providers
- Messages can be about bookings, quotes, event details, etc.
- The page **auto-refreshes** every few seconds, so new replies appear without reloading

### 8.11 Rating a Provider

After a booking is completed:

1. Go to the booking detail page
2. Rate the provider on 5 criteria:
   - Service Quality
   - Professionalism
   - Equipment Quality
   - Communication
   - Reliability
3. Optionally leave a comment
4. Submit

### 8.12 Viewing Invoices & Quotes

Go to `/dashboard/documents` to see all your documents:

- **Quotes** — Price estimates from providers
- **Invoices** — Bills for confirmed bookings
- **Receipts** — Payment confirmations

Click any document to view it. You can:

- **Print** it in A4 or Thermal (80mm receipt) format
- **Accept** a quote
- **Mark** as paid

### 8.13 Package Builder

Go to `/dashboard/packages` to build a complete event package:

1. Select an event
2. Choose providers by category (one per category)
3. Pick specific services from each provider
4. See the running total
5. Submit to book all providers at once

### 8.14 Budget Calculator

Go to `/dashboard/budget` to estimate costs:

1. Enter event type, guest count, and location
2. The system shows average prices from real providers:
   - Venue estimate
   - Catering estimate (per guest)
   - PA/Audio estimate
   - Photography estimate
   - Transport estimate
   - Decoration estimate
3. See min, average, and max prices
4. Visual bar chart shows cost breakdown

### 8.15 Timeline Planner

Go to `/dashboard/timeline` to schedule your event:

1. Select an event
2. Add timeline entries:
   - Time (e.g., "08:00")
   - Activity title (e.g., "Equipment Setup")
   - Description
   - Assigned provider (optional)
3. Reorder entries as needed
4. Save the timeline

---

## 9. Provider Manual

### 9.1 Creating a Provider Account

1. Click **"Get Started"** in the top-right corner
2. Fill in your details
3. Select **"Service Provider"** as account type
4. Enter your **Business Name**
5. Select your **Service Category** (Venue, PA/Audio, Catering, etc.)
6. Click **"Create Account"**
7. Your profile will be pending admin approval

### 9.2 Provider Dashboard

When you log in, you land on `/provider`. This shows:

- **Total Bookings** — All bookings you've received
- **Pending Requests** — New quotation requests
- **Total Revenue** — Money earned
- **Average Rating** — Your customer rating
- **Subscription Status** — Trial days remaining or active plan
- **Recent Booking Requests** — Table of recent inquiries

If your profile is not yet approved by admin, you'll see a yellow notice.

### 9.3 Subscription & Trial

When you register, you get a **30-day free trial**. Go to `/provider/subscription` to:

- See your current plan and usage
- View available plans with features and pricing
- **Start your free trial** (if not started)
- **Subscribe** to a paid plan
- **Upgrade** or **Downgrade** your plan

Your plan determines how many services, equipment items, and bookings you can have.

### 9.4 Managing Services

Go to `/provider/services` to manage what you offer:

**Add a service:**
1. Click "Add Service"
2. Enter name, description, category, and base price
3. Click "Add"

**Edit a service:** Click the edit pencil icon
**Toggle active/inactive:** Slide the toggle
**Delete:** Click the delete button

### 9.5 Managing Equipment

Go to `/provider/equipment` to manage your inventory:

**Add equipment:**
1. Click "Add Equipment"
2. Enter: name, category (audio/instruments/lighting), subcategory, quantity, condition, rental price
3. Optionally add setup charge, transport charge, operator charge
4. Click "Add"

Each item shows: name, subcategory, quantity, daily rate, and charges.

### 9.6 Setting Availability

Go to `/provider/calendar` to manage your calendar:

- Shows the current month with color-coded dates:
  - **Green** — Available
  - **Yellow** — Pending booking
  - **Red** — Booked/Unavailable
- Navigate between months
- Click a date to toggle between Available and Unavailable
- Booked dates are automatically blocked when a booking is confirmed

### 9.7 Dynamic Pricing

Set different prices for different situations. Example:

```
Base price: $500
Wedding surcharge: +$500
Corporate surcharge: +$800
Weekend multiplier: ×1.2
```

Pricing rule types:

| Modifier Type | How it works | Example |
|---------------|-------------|---------|
| **Fixed** | Adds a set amount | +$500 for weddings |
| **Multiplier** | Multiplies the base price | ×1.2 for weekends |
| **Percentage** | Adds a percentage | +20% for peak season |

Rules can apply to:
- Specific event types (Wedding, Funeral, Corporate, etc.)
- Weekends (Saturday/Sunday)
- Peak season (date range)
- All bookings (default rule)

### 8.8 Managing Bookings

Go to `/provider/bookings` to see all booking requests.

**When a customer requests a quote:**

1. Go to `/provider/bookings`
2. Click the booking to view details
3. Review the customer's event details
4. **Send Quotation** — Set your price and notes, then send
5. The customer will receive a notification

**When a customer accepts:**

1. The booking status changes to "Pending Approval"
2. You can **Confirm** or **Reject** it
3. If confirmed, the date is blocked on your calendar
4. If a deposit is required, you can set the deposit amount

**Booking lifecycle:**

```
Requested → Quotation Sent → Pending Approval → Confirmed
                                                    ↓
                                              Deposit Paid
                                                    ↓
                                              Completed
```

### 9.9 Messaging Customers

Go to `/provider/messages` to chat with customers:

- Conversations are grouped by customer, with **unread badges** on conversations you haven't opened
- Opening a conversation marks it as read
- Send text messages (Enter to send, Shift+Enter for a new line) and attach files — images, PDFs, Word documents
- Customers are notified when you message them
- If WhatsApp is connected, your replies are also delivered to the customer's WhatsApp; message bubbles show the delivery status
- The page **auto-refreshes** every few seconds

### 9.10 Reviews

Go to `/provider/reviews`:

- **Reviews Received** — Public ratings from customers (visible to everyone)
- **Your Ratings** — Private ratings you've given to customers (visible to providers only)

You can rate customers on: Payment Reliability, Communication, Respect for Agreements, Event Organization. These are private — customers don't see them.

### 9.11 Documents (Quotes & Invoices)

Go to `/provider/documents` to manage your documents:

- Quotes you've sent to customers
- Invoices for confirmed bookings
- Receipts for payments received

Documents are **auto-generated** when:
- You send a quotation (→ Quote generated)
- A payment is made (→ Receipt generated)

Click any document to view it. You can print in A4 or Thermal 80mm receipt format.

### 9.12 Settings

Go to `/provider/settings` to update your business profile:

- Business name
- Description
- Category
- City, Country
- Phone, Website
- Logo/cover image URLs

### 9.13 Local System Integration

If you have an existing local business system (desktop inventory software), you can sync it with Eventicate:

1. Go to `/provider/local-sync`
2. Enable local sync
3. Enter your local database URL and API key
4. Set sync interval
5. Use manual sync buttons:
   - **Sync Bookings to Local** — Copy online bookings to your local system
   - **Sync Inventory from Local** — Import equipment from your local system
   - **Push Booking to Local** — Send a specific booking to your local system

---

## 10. Admin Manual

### 10.1 Admin Dashboard

Login with the admin account (admin@eventicate.com / password123). You'll see:

- **Total Users** — All registered users
- **Active Providers** — Approved providers
- **Total Events** — Events created
- **Total Bookings** — All bookings made
- **Platform Revenue** — Total payments processed
- **Open Complaints** — Unresolved complaints
- **Pending Provider Approvals** — New providers waiting for approval
- **Popular Categories** — Most common service categories
- **Recent Bookings** — Latest platform activity

### 10.2 Managing Users

Go to `/admin/users`:

- View all users in a table (name, email, role, status, created date)
- **Filter by role** (All, Customer, Provider, Admin)
- **Search** by name or email
- **Activate/Deactivate** users — Deactivated users cannot log in

### 10.3 Managing Providers

Go to `/admin/providers`:

- View all providers in a table with name, email, phone, business, category, approval status, **payment status**, and active status
- **Payment filter** — see who has **Paid** (green badge, active subscription) vs **Not Paid** (red badge, trial/no subscription), or show everyone
- **Filter by approval status** (Pending, Approved, All) and **by category**
- **Add Provider** — create a provider account manually (name, email, password, phone, business, category, location). The provider receives a welcome email and can log in immediately
- **Approve/Reject** new providers — let them start receiving bookings or reject them
- **Edit** — update contact info, business name, category, description, location, and approval status
- **Deactivate/Reactivate** — deactivated providers **cannot log in** (their account is blocked); reactivating restores access
- **Delete** — permanently removes the account, but only if they have no bookings or services. If they do, the system tells you to **deactivate instead** so you don't lose historical data

### 10.4 Subscription Plans

Go to `/admin/subscription-plans` to manage pricing:

**The default plans:**

| Plan | Price | Services | Equipment | Bookings/mo | Venues | Vehicles |
|------|-------|----------|-----------|-------------|--------|----------|
| Free | $0/mo | 5 | 10 | 25 | 1 | 1 |
| Basic | $29/mo | 15 | 30 | 100 | 3 | 3 |
| Pro | $79/mo | 50 | 100 | 500 | 10 | 10 |
| Enterprise | $199/mo | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |

**You can:**
- **Create** new plans with custom limits
- **Edit** existing plans (change price, limits, features)
- **Delete** plans (be careful — providers on that plan will need to switch)
- **Reorder** plans (drag or set sort order)
- **Enable/Disable** plans (disabled plans aren't shown to providers)

Each plan has:
- `name` — Display name
- `description` — What the plan includes
- `price` — Monthly subscription fee
- `trialDays` — How many free trial days (0 = no trial)
- `maxServices` — Max services provider can list (-1 = unlimited)
- `maxEquipment` — Max equipment items (-1 = unlimited)
- `maxBookings` — Max bookings per month (-1 = unlimited)
- `maxVenues` — Max venue listings
- `maxVehicles` — Max vehicle listings
- `features` — List of feature descriptions shown to providers

### 10.5 Handling Complaints

Go to `/admin/complaints`:

- View all complaints from users
- **Filter by status** (Open, Investigating, Resolved, Dismissed)
- Click a complaint to expand and see details
- **Update status** — Mark as investigating, resolved, or dismissed
- **Add admin notes** — Internal notes about the resolution

### 10.6 Branding (Logo Upload)

Go to `/admin/branding` to customize the look:

**Upload logos:**
- **Light Logo** — Shown on light/white backgrounds (in the header)
- **Dark Logo** — Shown on dark backgrounds (when dark mode is active)
- **Invoice Logo** — Shown on quotes, invoices, and receipts

**How it works:**
1. Click the upload area for the logo you want to change
2. Select an image file (PNG, JPG, SVG — recommended: transparent PNG)
3. The logo appears as a preview
4. It's immediately used across the system
5. To remove a logo, click the "Remove" button — it falls back to displaying "Eventicate" text

**Where logos appear:**
- **Light Logo** — Top-left of every page (in light mode)
- **Dark Logo** — Top-left of every page (in dark mode)
- **Invoice Logo** — Top of quotes, invoices, and receipts

### 10.7 WhatsApp Configuration

Go to `/admin/whatsapp` to connect the platform's WhatsApp Business account for **two-way chat**:

**Fields:**
- **Access Token** — a permanent token from your Meta app (WhatsApp Business Cloud API)
- **Phone Number ID** — from the WhatsApp product settings
- **Verify Token** — any random string you choose
- **Business Phone** — the number people message, e.g. `254700000000`

**Setup:**
1. Create a Meta app with the WhatsApp product (requires a WhatsApp Business Account and business verification).
2. Save the four values here — the token and verify token are **masked** after saving (only the first/last 4 characters show) and never returned in full.
3. In the Meta app dashboard, set the **Callback URL** to `https://<your-api-domain>/api/whatsapp/webhook` and the **Verify Token** to the same value you saved.
4. Subscribe to the `messages` webhook field.

**What happens next:**
- Messages sent inside the app are also delivered to WhatsApp (each bubble shows sent/failed status).
- Replies sent to your business number appear in the app chat, matched to the user by phone number, and trigger a notification + email.
- If you leave it unconfigured, in-app messaging keeps working — WhatsApp sending is skipped silently.
- Demo phone numbers `+254700000001`–`+254700000006` are assigned to the demo accounts, so you can test with the WhatsApp sandbox.

---

## 11. Feature Catalog

### Complete list of all features

| # | Feature | Where to find it | Who can use it |
|---|---------|-----------------|---------------|
| 1 | **User Registration** | `/auth/register` | Everyone |
| 2 | **Login / Logout** | `/auth/login` | Everyone |
| 3 | **Google Sign-In** | Login page button | Everyone (if configured) |
| 4 | **Create Event** | `/dashboard/events/new` | Customer |
| 5 | **View Events** | `/dashboard/events` | Customer |
| 6 | **Event Details** | `/dashboard/events/[id]` | Customer |
| 7 | **Search Providers** | `/search` | Everyone |
| 8 | **Provider Profiles** | `/providers/[id]` | Everyone |
| 9 | **Request Quotation** | Provider profile → "Request Quotation" | Customer |
| 10 | **Bookings List** | `/dashboard/bookings` | Customer |
| 11 | **Booking Details** | `/dashboard/bookings/[id]` | Customer |
| 12 | **Accept/Reject Quote** | Booking detail page | Customer |
| 13 | **Make Payment (M-Pesa/PesaPal/Card/Bank)** | Booking detail / `/dashboard/checkout/[bookingId]` | Customer |
| 14 | **Sign Agreement** | `/dashboard/agreements/[bookingId]` | Customer |
| 15 | **Shopping Cart** | `/dashboard/cart` | Customer |
| 16 | **Cart → Quotes** | Cart page → "Generate Quotes" | Customer |
| 17 | **Customer Messages** | `/dashboard/messages` (unread badges, read receipts, attachments, WhatsApp) | Customer |
| 18 | **Multi-provider Threads** | Messages (grouped by master quote) | Customer/Provider |
| 19 | **Customer Documents** | `/dashboard/documents` | Customer || 20 | **Package Builder** | `/dashboard/packages` | Customer |
| 21 | **Budget Calculator** | `/dashboard/budget` | Customer |
| 22 | **Timeline Planner** | `/dashboard/timeline` | Customer |
| 23 | **Rate Provider** | Booking detail (after completed) | Customer |
| 24 | **Provider Dashboard** | `/provider` | Provider |
| 25 | **Manage Services** | `/provider/services` | Provider |
| 26 | **Manage Equipment** | `/provider/equipment` | Provider |
| 27 | **Availability Calendar** | `/provider/calendar` | Provider |
| 28 | **Dynamic Pricing** | Via services management | Provider |
| 29 | **Provider Bookings** | `/provider/bookings` | Provider |
| 30 | **Send Quotation** | Booking detail page | Provider |
| 31 | **Confirm/Reject Booking** | Booking detail page | Provider |
| 32 | **Provider Messages** | `/provider/messages` (unread badges, read receipts, attachments, WhatsApp) | Provider |
| 33 | **Provider Reviews** | `/provider/reviews` | Provider |
| 34 | **Provider Documents** | `/provider/documents` | Provider |
| 35 | **Provider Settings** | `/provider/settings` | Provider |
| 36 | **Subscription Page** | `/provider/subscription` | Provider |
| 37 | **Local System Sync** | `/provider/local-sync` | Provider |
| 38 | **Admin Dashboard** | `/admin` | Admin |
| 39 | **User Management** | `/admin/users` | Admin |
| 40 | **Provider Management** | `/admin/providers` (add/edit/deactivate/delete, paid filter) | Admin |
| 41 | **Complaint Management** | `/admin/complaints` | Admin |
| 42 | **Subscription Plans** | `/admin/subscription-plans` | Admin |
| 43 | **Branding (Logos)** | `/admin/branding` | Admin |
| 44 | **Payment Configuration (M-Pesa)** | `/admin/payments` | Admin |
| 45 | **WhatsApp Configuration** | `/admin/whatsapp` | Admin |
| 46 | **Location Data** | `/admin/locations` | Admin |
| 47 | **Dark/Light Theme** | Toggle in header/sidebar | Everyone |
| 48 | **Print A4 Documents** | Document detail → "Print A4" | Customer/Provider |
| 49 | **Print Thermal Receipts** | Document detail → "Print Thermal" | Customer/Provider |
| 50 | **Invoice Auto-Generation** | Automatic on payment | System |
| 51 | **Quote Auto-Generation** | Automatic on quote sent | System |
| 52 | **Notifications** | On bookings, messages, payments | Everyone |
| 53 | **Two-Way Ratings** | After completed bookings | Customer/Provider |
| 54 | **Country-Aware Currency** | Every price display | Everyone |
| 55 | **Two-Way WhatsApp Chat** | Automatic (when connected) | Customer/Provider |

### Database tables (at a glance)

| Table | Stores... |
|-------|----------|
| User | All user accounts |
| CustomerProfile | Customer-specific info |
| ProviderProfile | Business info and settings |
| Event | Customer events |
| Service | Provider service listings |
| Venue | Venue-specific details |
| Equipment | Rental equipment inventory |
| Vehicle | Transport vehicles |
| MenuPackage | Catering menu options |
| PhotoPackage | Photography/videography packages |
| PricingRule | Dynamic pricing rules |
| Booking | Booking records and status |
| Payment | Payment transactions |
| CartItem | Items in a customer's shopping cart |
| Agreement | Electronically signed booking agreements |
| AvailabilitySlot | Provider calendar dates (with booking links) |
| Message | In-app messages (incl. WhatsApp ID/status for mirrored messages) |
| Conversation | Message thread grouping (incl. multi-provider) |
| Review | Ratings and reviews |
| Notification | User notifications |
| Complaint | Admin-handled disputes |
| Document | Quotes, invoices, receipts |
| SubscriptionPlan | Pricing tiers |
| ProviderSubscription | Provider subscription status |
| LocalSyncConfig | Local system connection settings |
| LocalSyncLog | Sync activity records |
| SystemConfig | App settings (logo paths, app name, M-Pesa config, WhatsApp credentials) |

---

## 12. Customization Guide

### Changing colors

Edit `src/app/globals.css`:

```css
@theme {
  --color-primary-50: #fdf4ff;  /* Lightest shade */
  --color-primary-100: #fae8ff;
  --color-primary-200: #f5d0fe;
  --color-primary-300: #f0abfc;
  --color-primary-400: #e879f9;
  --color-primary-500: #d946ef;
  --color-primary-600: #c026d3; /* ★ Main brand color (change this) */
  --color-primary-700: #a21caf;
  --color-primary-800: #86198f;
  --color-primary-900: #701a75; /* Darkest shade */
}
```

Change `--color-primary-600` to your brand color (e.g., `#2563eb` for blue, `#dc2626` for red). The system will automatically use your color everywhere — buttons, links, headers, badges.

### Adding a new event type

1. Open `prisma/schema.prisma`
2. Find the `EventType` enum and add your type:
   ```prisma
   enum EventType {
     WEDDING
     FUNERAL
     BIRTHDAY
     CORPORATE
     CONCERT
     CHURCH
     GRADUATION
     OTHER
     SPORTS  // ← Add your new type here
   }
   ```
3. Open `src/lib/constants.ts` and add it to the list:
   ```typescript
   { value: "SPORTS", label: "Sports Event" },
   ```
4. Run `npm run db:push` to update the database

### Adding a new service category

Same process as above — add to the `ServiceCategory` enum in `schema.prisma` and the array in `constants.ts`.

### Changing the app name

Update `src/app/layout.tsx`:
```typescript
title: "Your App Name — Tagline",
```

Update `src/components/layout/Navigation.tsx` — the text fallback in the logo.

### Modifying subscription plans

You can do this through the admin UI at `/admin/subscription-plans`, no coding needed.

### Adding new pages

1. Create a folder in `src/app/` (e.g., `src/app/about/`)
2. Create `page.tsx` inside it
3. Write your page component
4. Add a link in `Navigation.tsx` if needed

---

## 13. Troubleshooting

### Common issues and solutions

**"Cannot find module" error when running `npm run dev`**
- Run `npm install` in the project root AND in `backend/`
- Run `cd backend && npm run db:generate` to generate the Prisma client

**"Database does not exist" / connection error**
- Check that `DATABASE_URL` in `backend/.env` points to a valid PostgreSQL database
- Run `npm run db:push` to create the tables

**Port 3000 already in use**
- Either close the other program using port 3000
- Or change the port: `npm run dev -- -p 3001`

**Port 3001 already in use (backend)**
- Change the backend port via `PORT` in `backend/.env` and update `BACKEND_URL` in the frontend `.env`

**Login doesn't work with demo accounts**
- Make sure you ran `npm run db:seed` to add demo data
- Check that `JWT_SECRET` in `backend/.env` matches the one in the frontend `.env`

**Pages look unstyled / no CSS**
- Make sure `npm install` was completed successfully
- Clear your browser cache (Ctrl+Shift+Delete)

**Google login shows error**
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `backend/.env`
- Check that the redirect URI in Google Cloud Console matches `GOOGLE_REDIRECT_URI`
- Google login works on `localhost` but needs HTTPS for production

**File upload not working**
- Make sure Cloudinary credentials are set in `backend/.env` (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)

**M-Pesa payment not working**
- Configure credentials in **Admin → Payments** (or `MPESA_*` env vars)
- Requires a Safaricom Daraja sandbox account to test (https://developer.safaricom.co.ke)
- Make sure `MPESA_CALLBACK_URL` is publicly reachable over HTTPS

**"Subscription limit reached" when adding services/equipment**
- Upgrade your plan at `/provider/subscription`
- Or ask admin to increase your plan limits at `/admin/subscription-plans`

**"This date is no longer available" when booking**
- The provider's calendar is locked for that date (pending/confirmed/unavailable). Pick another date or ask the provider to free it.

**How do I reset the database?**
- In PostgreSQL, drop/recreate the schema (or use a fresh database), then run `npm run db:push` and `npm run db:seed`

**How do I update to the latest version?**
- Pull the latest code: `git pull`
- Run `npm install` in both the root and `backend/`
- Run `npm run db:migrate` to apply any database migrations

---

## Index: Where to find what

| I need to... | Go to... |
|-------------|---------|
| Create an account | `/auth/register` |
| Sign in | `/auth/login` |
| Sign in with Google | Login page → Google button |
| Find event services | `/search` |
| View a provider's profile | `/providers/[id]` |
| Understand how it works | `/how-it-works` |
| Create an event | `/dashboard/events/new` |
| See my events | `/dashboard/events` |
| See my bookings | `/dashboard/bookings` |
| See booking details | `/dashboard/bookings/[id]` |
| Chat with providers | `/dashboard/messages` |
| View invoices/quotes | `/dashboard/documents` |
| Shopping cart | `/dashboard/cart` |
| Pay for a booking | `/dashboard/checkout/[bookingId]` |
| Sign an agreement | `/dashboard/agreements/[bookingId]` |
| Build a package | `/dashboard/packages` |
| Calculate budget | `/dashboard/budget` |
| Plan timeline | `/dashboard/timeline` |
| Provider dashboard | `/provider` |
| Manage services | `/provider/services` |
| Manage equipment | `/provider/equipment` |
| Manage calendar | `/provider/calendar` |
| Provider bookings | `/provider/bookings` |
| Provider messages | `/provider/messages` |
| Provider reviews | `/provider/reviews` |
| Provider documents | `/provider/documents` |
| Subscription info | `/provider/subscription` |
| Provider settings | `/provider/settings` |
| Local sync | `/provider/local-sync` |
| Admin dashboard | `/admin` |
| Manage users | `/admin/users` |
| Manage providers | `/admin/providers` |
| Handle complaints | `/admin/complaints` |
| Subscription plans | `/admin/subscription-plans` |
| Upload logos | `/admin/branding` |
| Configure M-Pesa | `/admin/payments` |
| Configure WhatsApp | `/admin/whatsapp` |
| Manage locations | `/admin/locations` |
| View database in GUI | `cd backend && npx prisma studio` |
| View demo data seed | File: `backend/prisma/seed.ts` |
| View database schema | File: `backend/prisma/schema.prisma` |

---

*End of documentation. For questions or support, contact your system administrator.*

*Document generated from Eventicate v1.0.0*
