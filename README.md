# Eventicate

**Event Management Marketplace and Booking System**

Eventicate is a web-based marketplace that connects people planning events (like weddings, birthdays, corporate events, funerals, concerts, etc.) with service providers who offer the things they need (venues, sound systems, catering, photography, transport, decoration, entertainment, etc.).

Think of it like an "Uber for event services" — one website where you can:
- Create an event with all your requirements
- Find and compare service providers in your area
- Get price quotes from multiple providers
- Book and pay for services
- Communicate with providers
- Manage everything from one dashboard

---

## Table of Contents

1. [What is this project?](#what-is-this-project)
2. [Who is it for?](#who-is-it-for)
3. [What language/code is this?](#what-languagecode-is-this)
4. [Features at a glance](#features-at-a-glance)
5. [How to install and run](#how-to-install-and-run)
6. [Demo accounts](#demo-accounts)
7. [Project structure explained](#project-structure-explained)
8. [How the database works](#how-the-database-works)
9. [How the booking flow works](#how-the-booking-flow-works)
10. [Subscription & trial system](#subscription--trial-system)
11. [Invoices & quotes](#invoices--quotes)
12. [Dark/Light theme](#darklight-theme)
13. [Google login](#google-login)
14. [API routes](#api-routes)
15. [How to customize](#how-to-customize)

---

## What is this project?

Eventicate is a **full-stack web application** — meaning it has both a **frontend** (what users see and click on in their browser) and a **backend** (the server that stores data and handles logic).

The goal is to create a single platform where:
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

## What language/code is this?

Here is every technology used, explained simply:

### Programming Languages
- **TypeScript** — The main language. It's JavaScript but with extra rules to catch mistakes before the code runs. All the code is written in TypeScript (files end in `.ts` or `.tsx`).
- **SQL** — The language used to talk to the database. You don't write SQL directly — the Prisma tool handles it.

### Frameworks & Libraries
- **Next.js 15** — A framework built on top of React. It handles both the frontend (what you see in the browser) AND the backend (the server that processes data). When you visit a page, Next.js decides whether to generate it on the server or in the browser. Files in `src/app/` become web pages automatically based on their folder structure.
- **React 19** — A JavaScript library for building user interfaces. It lets you build reusable components (like buttons, cards, forms) and manages how they update when data changes.
- **Tailwind CSS 4** — A CSS framework that lets you style things by adding class names directly in your HTML/JSX. For example, `bg-blue-500` makes something blue, `text-lg` makes text larger. It works by scanning your files and generating only the CSS you actually use.
- **Prisma** — A tool that lets you work with databases using TypeScript instead of writing raw SQL. You define your database structure in `prisma/schema.prisma` and Prisma generates a TypeScript library to query it.
- **Zod** — A validation library that checks if data (like form inputs) has the right format and gives clear error messages if not.
- **Jose** — A library for creating and verifying JSON Web Tokens (JWTs), which are like digital ID cards that prove a user is logged in.
- **Lucide React** — A collection of icons (like a calendar icon or a search icon) that you can use in your React components.
- **Bcryptjs** — A library that scrambles (hashes) passwords so they can't be read even if the database is hacked.

### Database
- **SQLite** (for development) — A file-based database. The entire database is a single file at `prisma/dev.db`. You can switch to PostgreSQL for production by changing the `DATABASE_URL` in your `.env` file.

### How they all fit together

```
Browser (what user sees)
    ↓
Next.js (serves the pages & handles navigation)
    ↓
React Components (buttons, forms, cards — built with TypeScript)
    ↓
Tailwind CSS (makes everything look nice)
    ↓
API Routes (backend code that processes requests)
    ↓
Prisma (talks to the database)
    ↓
SQLite / PostgreSQL (where all data is stored)
```

---

## Features at a glance

### For Customers
- **Create events** — Pick a name, type (wedding/funeral/birthday/etc.), date, location, number of guests, and budget
- **Search providers** — Filter by category, location, budget
- **View provider profiles** — See their services, prices, equipment, availability calendar, reviews
- **Package Builder** — Build a complete event package by selecting multiple providers at once
- **Budget Calculator** — Get estimated costs based on real provider prices in the system
- **Timeline Planner** — Create a schedule for your event (e.g., "10:00 — Guests arrive, 12:00 — Ceremony")
- **Request quotes** — Ask providers for price estimates
- **Book services** — Accept quotes, pay deposits, track booking status
- **Messaging** — Chat with providers, share files and documents
- **Reviews** — Rate providers after events are completed
- **Documents** — View all your quotes, invoices, and receipts in one place

### For Service Providers
- **Business profile** — Name, description, photos, location, contact info
- **Services** — List what you offer with prices
- **Equipment inventory** — Track items with quantities, conditions, rental prices
- **Menu packages** — For caterers, with per-guest pricing
- **Venues** — For venue providers, with capacity and facilities
- **Vehicles** — For transport providers
- **Availability calendar** — Mark dates as available, pending, or booked (auto-blocks on booking)
- **Dynamic pricing** — Set different prices for different event types, weekends, or peak seasons
- **Quotations** — Send professional quotes to customers
- **Booking management** — Accept/confirm/reject bookings
- **Subscription** — 30-day free trial, then choose a paid plan
- **Local sync** — Connect your local business system for offline inventory management
- **Documents** — Generate quotes and invoices for customers

### For Administrators
- **Dashboard** — See platform stats (users, providers, events, bookings, revenue)
- **User management** — View all users, activate/deactivate accounts
- **Provider management** — Approve/reject provider registrations
- **Complaint handling** — Track and resolve disputes
- **Subscription plans** — Create and manage pricing tiers for providers

---

## How to install and run

### Step 1: What you need installed
- **Node.js** (version 18 or newer) — This runs JavaScript on your computer. Download from https://nodejs.org
- **npm** (comes with Node.js) — This installs the libraries the project needs

### Step 2: Open your terminal/command prompt
- On Windows: Search for "Command Prompt" or "PowerShell" and open it
- On Mac: Open "Terminal" from Applications/Utilities
- On Linux: Open your terminal app

### Step 3: Navigate to the project folder
```bash
cd C:\Users\User\Documents\Projects\Eventicate
```
(If your terminal shows a different path, use the actual path where the project is saved)

### Step 4: Install dependencies
```bash
npm install
```
This downloads all the libraries the project needs (React, Next.js, Prisma, etc.) and puts them in the `node_modules` folder. It might take 1-2 minutes.

### Step 5: Set up your environment variables
```bash
cp .env.example .env
```
(On Windows, just copy the `.env.example` file and rename it to `.env`)

Open `.env` in a text editor. It should look like:
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="eventicate-dev-secret-change-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
For development, the defaults work fine. In production, change the JWT_SECRET to a random string.

### Step 6: Set up the database
```bash
npm run db:push
```
This creates the database file (`prisma/dev.db`) with all the tables defined in the schema.

### Step 7: Add demo data (optional but recommended)
```bash
npm run db:seed
```
This adds sample data so you can test the app immediately — demo user accounts, providers, services, equipment, and a sample event.

### Step 8: Start the development server
```bash
npm run dev
```
You'll see output like:
```
▲ Next.js 15.x.x
- Local: http://localhost:3000
```

### Step 9: Open in your browser
Go to **http://localhost:3000** in your web browser (Chrome, Firefox, Edge, etc.)

### Step 10: Stop the server
Press `Ctrl + C` in the terminal to stop the server when you're done.

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

To register a new account, click "Get Started" in the top-right corner.

---

## Project structure explained

```
Eventicate/
│
├── .env                    # Secret settings (database URL, JWT secret, API keys)
├── .env.example            # Template for .env (copy this)
├── package.json            # Lists all libraries (dependencies) and commands (scripts)
├── next.config.ts          # Next.js configuration
├── tsconfig.json           # TypeScript settings
├── postcss.config.mjs      # CSS processing configuration
│
├── prisma/
│   ├── schema.prisma       # ★ THE DATABASE SCHEMA — defines all tables and relationships
│   ├── seed.ts             # Script that fills the database with demo data
│   └── dev.db              # The actual SQLite database file (created by db:push)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx       # ★ THE ROOT LAYOUT — wraps every page (has <html>, <head>, <body>)
│   │   ├── globals.css      # ★ GLOBAL STYLES — CSS that applies to everything
│   │   ├── page.tsx         # The homepage (route: /)
│   │   ├── how-it-works/    # Info page (route: /how-it-works)
│   │   ├── search/          # Find services page (route: /search)
│   │   ├── auth/            # Login and registration pages
│   │   │   ├── login/       # Sign in page
│   │   │   └── register/    # Sign up page
│   │   ├── dashboard/       # ★ CUSTOMER PORTAL — all customer pages
│   │   │   ├── page.tsx                 # Dashboard home
│   │   │   ├── events/                  # Event management
│   │   │   ├── bookings/                # Booking management
│   │   │   ├── messages/                # Chat with providers
│   │   │   ├── documents/               # Quotes & invoices
│   │   │   ├── packages/                # Package Builder
│   │   │   ├── budget/                  # Budget Calculator
│   │   │   └── timeline/                # Event Timeline Planner
│   │   ├── provider/         # ★ PROVIDER PORTAL — all provider pages
│   │   │   ├── page.tsx                 # Provider dashboard
│   │   │   ├── bookings/                # Manage bookings
│   │   │   ├── services/                # Manage services
│   │   │   ├── equipment/               # Manage equipment inventory
│   │   │   ├── calendar/                # Availability calendar
│   │   │   ├── messages/                # Chat with customers
│   │   │   ├── reviews/                 # View/manage reviews
│   │   │   ├── documents/               # Quotes & invoices
│   │   │   ├── subscription/            # Plan management
│   │   │   ├── settings/                # Profile settings
│   │   │   └── local-sync/              # Local system integration
│   │   ├── admin/            # ★ ADMIN PORTAL — all admin pages
│   │   │   ├── page.tsx                 # Admin dashboard
│   │   │   ├── users/                   # User management
│   │   │   ├── providers/               # Provider management
│   │   │   ├── complaints/              # Complaint handling
│   │   │   └── subscription-plans/      # Pricing tier management
│   │   ├── providers/        # ★ PUBLIC PROVIDER PROFILES
│   │   │   └── [id]/         # Single provider profile (anyone can view)
│   │   └── api/              # ★ BACKEND API — all server endpoints
│   │       ├── auth/         # Login, register, session management
│   │       ├── events/       # Event CRUD
│   │       ├── bookings/     # Booking CRUD + status updates
│   │       ├── providers/    # Provider search and profiles
│   │       ├── payments/     # Payment processing
│   │       ├── messages/     # Chat messaging
│   │       ├── reviews/      # Rating system
│   │       ├── documents/    # Quotes and invoices
│   │       ├── admin/        # Admin operations
│   │       └── ...           # And many more
│   │
│   ├── components/
│   │   ├── ui/               # ★ REUSABLE UI COMPONENTS
│   │   │   ├── Button.tsx    # Buttons (primary, secondary, outline, danger)
│   │   │   ├── Card.tsx      # Cards (containers with border/shadow)
│   │   │   ├── Input.tsx     # Text inputs, dropdown selects, textareas
│   │   │   └── Badge.tsx     # Status labels, star ratings
│   │   ├── layout/           # Navigation bars, sidebars
│   │   ├── calendar/         # Interactive availability calendar
│   │   ├── auth/             # Login/register forms
│   │   └── theme/            # Dark/light mode toggle
│   │
│   └── lib/                  # ★ HELPER CODE
│       ├── prisma.ts         # Database connection
│       ├── auth.ts           # Password hashing, JWT tokens, session cookies
│       ├── booking-engine.ts # Calculating prices, blocking dates
│       ├── subscription.ts   # Plan limits, trial management
│       ├── documents.ts      # Invoice/quote generation
│       ├── constants.ts      # Event types, categories, labels
│       ├── utils.ts          # Formatting dates, currency, JSON
│       └── theme-config.ts   # Dark/light mode detection
│
└── node_modules/             # ★ ALL INSTALLED LIBRARIES (auto-generated, don't touch)
```

### How pages work (routing)

In Next.js, every folder inside `src/app` with a `page.tsx` file becomes a web page. The folder path becomes the URL:

| Folder | URL |
|--------|-----|
| `src/app/page.tsx` | `/` (homepage) |
| `src/app/dashboard/page.tsx` | `/dashboard` |
| `src/app/dashboard/events/new/page.tsx` | `/dashboard/events/new` |
| `src/app/dashboard/events/[id]/page.tsx` | `/dashboard/events/abc123` |
| `src/app/providers/[id]/page.tsx` | `/providers/xyz789` |

Folders in square brackets like `[id]` are **dynamic routes** — they match any value and pass it as a parameter. For example, visiting `/providers/abc123` makes `params.id = "abc123"` available in the page.

### How API routes work

Similarly, every `route.ts` file inside `src/app/api/` becomes an API endpoint:

| File | URL | Methods |
|------|-----|---------|
| `src/app/api/auth/login/route.ts` | `POST /api/auth/login` | POST only |
| `src/app/api/events/route.ts` | `GET /api/events` and `POST /api/events` | GET, POST |
| `src/app/api/events/[id]/route.ts` | `GET /api/events/abc123` | GET |

### Server vs Client Components

- **Server Components** (default) — Run on the server, send HTML to the browser. Used for pages that fetch data from the database. They're faster and more secure.
- **Client Components** — Have `"use client"` at the top. Run in the browser. Used when you need interactivity (buttons that change things, forms, real-time updates).
- Most pages use server components to fetch data, then have small client components embedded for interactive parts (like clicking a button to approve a booking).

---

## How the database works

The database is defined in `prisma/schema.prisma`. This file describes every table and how they relate to each other.

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
  │                                                                  └── Has many → Reviews
  │
  └── Has one → ProviderProfile
                   │
                   ├── Has many → Services
                   ├── Has many → Equipment
                   ├── Has many → Vehicles
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
- **ServiceCategory**: VENUE, PA_SYSTEM, CATERING, TRANSPORT, PHOTOGRAPHY, VIDEOGRAPHY, DECORATION, ENTERTAINMENT, OTHER
- **BookingStatus**: QUOTATION_REQUESTED → QUOTATION_SENT → PENDING_APPROVAL → CONFIRMED → DEPOSIT_PAID → COMPLETED (or CANCELLED/REJECTED)
- **PaymentMethod**: CARD, BANK_TRANSFER, CASH, MOBILE_MONEY
- **SubscriptionStatus**: TRIAL, ACTIVE, EXPIRED, CANCELLED, PAST_DUE

### How to view the database

```bash
npm run db:studio
```

This opens Prisma Studio — a web interface where you can browse and edit all the data in your database visually. It opens at http://localhost:5555.

---

## How the booking flow works

The booking process has 8 defined statuses. Here's the full flow:

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

At each step, the system:
- **Blocks dates** on the provider's availability calendar (prevents double-booking)
- **Sends notifications** to both parties
- **Updates dashboards** in real-time
- **Generates documents** — quotes when provider sends pricing, invoices/receipts when payments are made

---

## Subscription & trial system

### How it works for providers

1. **30-day free trial**: When a new provider registers, they get a 30-day free trial (auto-started). They can use all features during the trial.

2. **Tiered plans**: After the trial, they need to choose a paid plan:

   | Plan | Price | Services | Equipment | Bookings/mo |
   |------|-------|----------|-----------|-------------|
   | **Free** | $0 | 5 | 10 | 25 |
   | **Basic** | $29 | 15 | 30 | 100 |
   | **Pro** | $79 | 50 | 100 | 500 |
   | **Enterprise** | $199 | Unlimited | Unlimited | Unlimited |

3. **Restrictions**: If a provider tries to add more services/equipment than their plan allows, they'll get an error message telling them to upgrade.

### How to set up plans

1. Login as admin (admin@eventicate.com)
2. Go to `/admin/subscription-plans`
3. You can create, edit, delete plans
4. Change prices, limits, features anytime

### For administrators

You have full control over:
- How many plans exist
- What each plan costs
- What limits each plan has
- How long the trial lasts
- What features to include

To disable the trial system temporarily, set trialDays to 0 on all plans.

---

## Invoices & quotes

### Auto-generation

The system automatically creates documents at key moments:

1. **Quote**: When a provider sends a quotation (sets a price on a booking request)
2. **Invoice**: When a customer accepts and payment is due
3. **Receipt**: When a payment is actually made

### Document numbers

Each document gets a unique number:
- `QTE-0001`, `QTE-0002`... for quotes
- `INV-0001`, `INV-0002`... for invoices
- `RCT-0001`, `RCT-0002`... for receipts

### Where to find them

- **Customers**: Go to `/dashboard/documents` to see all quotes, invoices, and receipts
- **Providers**: Go to `/provider/documents` to manage documents you've sent

### Actions you can take

- **View** the document as a nicely formatted page
- **Print** using your browser's Print function (Ctrl+P) — the page is styled to print cleanly
- **Accept** a quote (customer)
- **Mark as paid** (provider, for cash payments)

---

## Dark/Light theme

### How it works

- **First visit**: Automatically follows your computer/phone's theme setting (system preference)
- **Toggle**: Click the sun/moon/monitor icon in the top navigation bar or bottom of sidebar to switch between:
  - 🌙 Dark mode
  - ☀️ Light mode
  - 💻 System (follows your device)
- **Remembers**: Your choice is saved and persists even if you close your browser

### Technical details

The theme is stored in your browser's `localStorage`. On every page load, a tiny script runs before anything else renders to prevent the "flash of wrong theme" — so the correct theme is applied instantly before you even see the page.

---

## Google login

### How to enable it

1. Go to https://console.cloud.google.com/apis/credentials
2. Create a new OAuth 2.0 Client ID (choose "Web application")
3. Add `http://localhost:3000/api/auth/google/callback` as an authorized redirect URI
4. Copy the Client ID and Client Secret
5. Add them to your `.env` file:

```
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

6. Restart the dev server

### How it works

- On the login page (`/auth/login`), a "Sign in with Google" button appears
- Clicking it takes you to Google's consent screen
- After you authorize, Google sends you back to the app
- If you're a new user, an account is created automatically
- If you already have an account with that email, you're logged in
- Google users have no password — they can only sign in with Google

---

## API routes

The full list of API endpoints. Each one handles data in the background:

| Endpoint | Methods | What it does |
|----------|---------|-------------|
| `/api/auth/register` | POST | Create new account |
| `/api/auth/login` | POST | Sign in |
| `/api/auth/session` | GET | Check if logged in |
| `/api/auth/google` | GET | Redirect to Google login |
| `/api/auth/google/callback` | GET | Handle Google's response |
| `/api/events` | GET, POST | List/create events |
| `/api/events/[id]` | GET | Get one event |
| `/api/bookings` | GET, POST | List/create bookings |
| `/api/bookings/[id]` | GET, PATCH | View/update booking |
| `/api/providers` | GET | Search providers |
| `/api/providers/[id]` | GET | Get provider profile |
| `/api/messages` | GET, POST | Send/receive messages |
| `/api/reviews` | GET, POST | Submit/view reviews |
| `/api/payments` | POST | Process payments |
| `/api/services` | GET, POST, PATCH, DELETE | Manage services |
| `/api/equipment` | GET, POST, PATCH, DELETE | Manage equipment |
| `/api/availability` | GET, POST | Manage calendar |
| `/api/documents` | GET, POST | List/create documents |
| `/api/documents/[id]` | GET, PATCH, DELETE | View/update/cancel document |
| `/api/documents/generate` | POST | Auto-generate from booking |
| `/api/admin` | GET, PATCH | Admin dashboard + approve providers |
| `/api/admin/users` | GET, PATCH | User management |
| `/api/admin/complaints` | GET, PATCH | Complaint management |
| `/api/admin/subscription-plans` | GET, POST, PATCH, DELETE | Plan management |
| `/api/provider/settings` | GET, PATCH | Provider profile settings |
| `/api/provider/subscription` | GET, POST | Provider subscription |
| `/api/provider/subscription/check` | GET | Check plan limits |
| `/api/packages` | POST | Create multi-provider package |
| `/api/budget` | GET | Get cost estimates |
| `/api/timeline` | GET, POST | Save/load event timeline |
| `/api/local-sync` | GET, POST, PUT | Local system integration |

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
1. Add database tables in `prisma/schema.prisma`
2. Run `npm run db:push` to update the database
3. Create API routes in `src/app/api/`
4. Create pages in the appropriate `src/app/` folder
5. Add navigation links in `src/components/layout/Navigation.tsx`

### Setting up for production
1. Change `DATABASE_URL` in `.env` to a PostgreSQL database URL
2. Set a strong random `JWT_SECRET`
3. Set `NEXT_PUBLIC_APP_URL` to your domain
4. Run `npm run build` to create the production version
5. Deploy the `.next` folder to a hosting service (Vercel, AWS, etc.)

---

## Need help?

- Check Prisma Studio: `npm run db:studio`
- Check the console in your browser's DevTools (F12) for errors
- The terminal running `npm run dev` shows server-side errors
- Search the codebase for specific terms using your code editor's search

---

## License

Private project — All rights reserved.
