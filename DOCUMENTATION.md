# Eventicate — Complete System Documentation

> **Full-Stack Event Management Marketplace Platform**
>
> Version 1.0.0 | Last Updated: June 2026

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
| **SQL** | Database queries (handled automatically by Prisma — you don't write SQL directly) | `.prisma` (schema) |
| **CSS** | Styling and layout of web pages | `.css` (in globals.css and Tailwind classes) |

### Frontend (What users see in their browser)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15 | The framework that runs the entire application — handles both the website pages AND the backend server |
| **React** | 19 | A library for building user interface components (buttons, forms, cards, etc.) |
| **Tailwind CSS** | 4 | A styling system that lets you add visual design by writing class names directly in your code (e.g., `bg-blue-500` makes a blue background, `text-lg` makes text larger) |
| **Lucide React** | Latest | A collection of icons (calendar, search, settings, etc.) used throughout the interface |

### Backend (The server that processes data)

| Technology | Purpose |
|-----------|---------|
| **Next.js API Routes** | The backend is built into Next.js — files in `src/app/api/` automatically become API endpoints |
| **Prisma ORM** | A tool that lets you work with the database using TypeScript. You define the database structure in `schema.prisma` and Prisma generates the code to query it |
| **Jose** | Creates and verifies JSON Web Tokens (JWTs) — these are like digital ID cards that prove a user is logged in |
| **Bcryptjs** | Scrambles (hashes) passwords so they can't be read even if the database is stolen |
| **Zod** | Validates data — checks that form inputs, API requests, etc. have the correct format before processing them |

### Database

| Database | When to use | File |
|----------|------------|------|
| **SQLite** | Development & testing | `prisma/dev.db` (a single file) |
| **PostgreSQL** | Production / live deployment | Set via `DATABASE_URL` in `.env` |

### Hosting / Deployment

| Service | Best for | Notes |
|---------|----------|-------|
| **Vercel** | Easiest deployment | Made by the same company as Next.js — one-click deploy |
| **Railway** | Good for full-stack | Supports databases and custom domains |
| **DigitalOcean** | More control | You manage the server yourself |
| **AWS / Azure** | Enterprise scale | Most powerful but most complex |

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
│                  NEXT.JS SERVER                              │
│                                                             │
│  ┌─────────────────────┐    ┌──────────────────────────┐    │
│  │   React Components  │    │    API Routes (Backend)  │    │
│  │   (what renders)    │───▶│   (processes requests)   │    │
│  └─────────────────────┘    └───────────┬──────────────┘    │
│                                         │                    │
└─────────────────────────────────────────┼────────────────────┘
                                          │
                                          ▼
                          ┌─────────────────────────────┐
                          │        PRISMA ORM            │
                          │  (Database query builder)    │
                          └─────────────┬───────────────┘
                                        │
                                        ▼
                          ┌─────────────────────────────┐
                          │         DATABASE             │
                          │  SQLite (dev) / PostgreSQL   │
                          │  Tables: Users, Events,      │
                          │  Bookings, Payments, etc.    │
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
│   ├── messages/page.tsx       →  /dashboard/messages
│   ├── documents/
│   │   ├── page.tsx            →  /dashboard/documents  (Invoices & quotes)
│   │   └── [id]/page.tsx       →  /dashboard/documents/abc
│   ├── packages/page.tsx       →  /dashboard/packages   (Package builder)
│   ├── budget/page.tsx         →  /dashboard/budget     (Budget calculator)
│   └── timeline/page.tsx       →  /dashboard/timeline   (Timeline planner)
├── provider/
│   ├── page.tsx                →  /provider             (Provider home)
│   ├── bookings/
│   │   └── ...                 →  /provider/bookings/...
│   ├── services/page.tsx       →  /provider/services
│   ├── equipment/page.tsx      →  /provider/equipment
│   ├── calendar/page.tsx       →  /provider/calendar
│   ├── messages/page.tsx       →  /provider/messages
│   ├── reviews/page.tsx        →  /provider/reviews
│   ├── documents/
│   │   └── ...                 →  /provider/documents/...
│   ├── subscription/page.tsx   →  /provider/subscription
│   ├── settings/page.tsx       →  /provider/settings
│   └── local-sync/page.tsx     →  /provider/local-sync
├── admin/
│   ├── page.tsx                →  /admin                (Admin home)
│   ├── users/page.tsx          →  /admin/users
│   ├── providers/page.tsx      →  /admin/providers
│   ├── complaints/page.tsx     →  /admin/complaints
│   ├── subscription-plans/     →  /admin/subscription-plans
│   │   └── page.tsx
│   └── branding/page.tsx       →  /admin/branding       (Logo upload)
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

### Step 3: Install dependencies

Open a terminal/command prompt in the project folder and run:

```bash
npm install
```

This downloads all the libraries the project needs (React, Next.js, Prisma, etc.) into a folder called `node_modules`. This may take 1-3 minutes depending on your internet speed.

### Step 4: Configure environment

Create a file called `.env` in the project root (copy from `.env.example`):

```bash
# On Windows (CMD):
copy .env.example .env

# On Mac/Linux:
cp .env.example .env
```

Open `.env` in a text editor. The default values work for development:

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="eventicate-dev-secret-change-in-production"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

- `DATABASE_URL` — Where the database is stored. `file:./dev.db` uses SQLite (a file).
- `JWT_SECRET` — A secret key used to encrypt login sessions. Change this to a random string in production.
- `NEXT_PUBLIC_APP_URL` — Your website URL. For development, `http://localhost:3000`.

### Step 5: Set up the database

```bash
npm run db:push
```

This creates all the database tables based on the schema in `prisma/schema.prisma`. You should see output like "Your database is now in sync with your schema."

### Step 6: Add demo data (recommended)

```bash
npm run db:seed
```

This fills the database with sample data so you can immediately test the system:

- **5 user accounts** (admin, customer, PA provider, catering provider, venue provider)
- **Sample services, equipment, menu packages**
- **Dynamic pricing rules**
- **A sample wedding event with a booking**
- **Default subscription plans** (Free, Basic, Pro, Enterprise)

### Step 7: Start the development server

```bash
npm run dev
```

You should see:
```
▲ Next.js 15.x.x
- Local: http://localhost:3000
```

### Step 8: Open in your browser

Go to **http://localhost:3000** in your web browser.

### Step 9: Stop the server

Press `Ctrl + C` in the terminal.

### Quick Reference: All npm Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server (after build) |
| `npm run lint` | Check code for errors |
| `npm run db:push` | Update database with latest schema |
| `npm run db:seed` | Fill database with demo data |
| `npm run db:studio` | Open Prisma Studio (visual database browser) |
| `npm run db:generate` | Regenerate Prisma client after schema changes |

---

## 5. How to Host / Deploy

### Option A: Deploy to Vercel (Easiest — Recommended)

Vercel is made by the same team that built Next.js, so it works perfectly.

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # Create a repository on GitHub.com, then:
   git remote add origin https://github.com/yourusername/eventicate.git
   git push -u origin main
   ```

2. **Go to https://vercel.com** and sign up (free tier available)
3. Click **"Add New" → "Project"**
4. Import your GitHub repository
5. **Environment Variables** — Add these:
   - `DATABASE_URL` → Your PostgreSQL connection string (Vercel provides Postgres via Vercel Storage, or use a service like Neon.tech, Supabase, or Railway)
   - `JWT_SECRET` → A random string (generate at https://randomkeygen.com)
   - `NEXT_PUBLIC_APP_URL` → Your domain (e.g., `https://eventicate.vercel.app`)
6. Click **Deploy**
7. Your site is live! Vercel auto-deploys whenever you push to GitHub.

### Option B: Deploy to Railway

1. Push to GitHub (same as above)
2. Go to https://railway.app, sign up, click **"New Project" → "Deploy from GitHub"**
3. Railway auto-detects Next.js projects
4. Add environment variables (same as above)
5. Railway can also provision a PostgreSQL database for you

### Option C: Manual Server Deployment (DigitalOcean, AWS, etc.)

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Set up PostgreSQL** on your server (or use a managed service)

3. **Set up environment variables** on the server:
   ```
   DATABASE_URL="postgresql://user:password@host:5432/database"
   JWT_SECRET="your-random-secret-key"
   NEXT_PUBLIC_APP_URL="https://yourdomain.com"
   ```

4. **Run database migrations:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. **Start the server:**
   ```bash
   npm run start
   ```

6. **Use a process manager** (like PM2) to keep the app running:
   ```bash
   npm install -g pm2
   pm2 start npm --name "eventicate" -- start
   pm2 save
   pm2 startup
   ```

7. **Set up a reverse proxy** with Nginx to handle SSL (HTTPS) and domain routing.

### Option D: Local Network / Intranet

If you want to run it on your local network:

1. Start the server normally: `npm run dev`
2. Find your local IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. Access from other devices: `http://YOUR_IP:3000`
4. For permanent local use, set up the production build:
   ```bash
   npm run build
   npm run start
   ```

### Production Checklist

Before going live, make sure to:

- [ ] **Change JWT_SECRET** to a strong random value
- [ ] **Switch to PostgreSQL** instead of SQLite
- [ ] **Set up HTTPS/SSL** (Vercel/Railway do this automatically)
- [ ] **Configure Google OAuth** (if using Google login)
- [ ] **Upload your brand logos** via `/admin/branding`
- [ ] **Review subscription plan pricing** at `/admin/subscription-plans`
- [ ] **Test all user flows** before announcing the platform
- [ ] **Set up regular database backups**

---

## 6. File & Folder Structure

### Top-level files

```
Eventicate/
│
├── .env                        # SECRET — database URL, JWT secret, API keys
├── .env.example                # Template showing what .env should look like
├── .gitignore                  # Files Git should ignore (node_modules, .env, etc.)
├── package.json                # Project info, dependencies, and commands
├── package-lock.json           # Auto-generated — locks dependency versions
├── next.config.ts              # Next.js settings
├── tsconfig.json               # TypeScript settings
├── postcss.config.mjs          # CSS processing settings
├── eslint.config.mjs           # Code quality checking rules
└── README.md                   # This documentation!
```

### Source code (`src/`)

```
src/
│
├── app/                        # ★ ALL PAGES AND API ROUTES
│   │                           #   (This is where the website lives)
│   │
│   ├── layout.tsx              # Root layout — wraps every page (has <html>, <head>)
│   ├── globals.css              # Global styles — colors, fonts, backgrounds
│   ├── page.tsx                # Homepage (/)
│   │
│   ├── api/                    # ★ BACKEND — All server endpoints
│   │   ├── auth/               #   Registration, login, session management
│   │   ├── events/             #   Event CRUD
│   │   ├── bookings/           #   Booking CRUD + status updates
│   │   ├── providers/          #   Provider search and profiles
│   │   ├── services/           #   Provider services CRUD
│   │   ├── equipment/          #   Equipment inventory CRUD
│   │   ├── payments/           #   Payment processing
│   │   ├── messages/           #   Chat messaging
│   │   ├── reviews/            #   Rating system
│   │   ├── documents/          #   Quotes, invoices, receipts
│   │   ├── packages/           #   Multi-provider packages
│   │   ├── budget/             #   Cost estimation
│   │   ├── timeline/           #   Event timeline
│   │   ├── availability/       #   Calendar availability
│   │   ├── admin/              #   Admin operations
│   │   ├── provider/           #   Provider settings & subscription
│   │   └── local-sync/         #   Local system integration
│   │
│   ├── auth/                   # ★ PUBLIC PAGES
│   │   ├── login/page.tsx      #   Sign in (/auth/login)
│   │   └── register/page.tsx   #   Sign up (/auth/register)
│   │
│   ├── dashboard/              # ★ CUSTOMER PORTAL
│   │   ├── page.tsx            #   Dashboard home
│   │   ├── events/             #   Event management
│   │   ├── bookings/           #   Booking management
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
│   │   └── branding/           #   Logo upload
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
│   │   ├── Badge.tsx           #   Status labels, star ratings
│   │   └── EventicateLogo.tsx  #   Logo (adapts to light/dark theme)
│   ├── layout/                 #   Navigation & layout
│   │   └── Navigation.tsx      #   Sidebar, public header, category icons
│   ├── auth/                   #   Login & registration forms
│   ├── calendar/               #   Availability calendar widget
│   ├── theme/                  #   Dark/light theme toggle
│   └── documents/              #   Invoice/quote display & print
│
└── lib/                        # ★ HELPER FUNCTIONS
    ├── prisma.ts               #   Database connection (singleton)
    ├── auth.ts                 #   Password hashing, JWT tokens, session cookies
    ├── booking-engine.ts       #   Price calculation, availability management
    ├── documents.ts            #   Invoice/quote number generation
    ├── subscription.ts         #   Plan limits, trial management
    ├── constants.ts            #   Event types, categories, status labels
    ├── utils.ts                #   Format dates, currency, JSON helpers
    ├── google-auth.ts          #   Google OAuth configuration
    └── theme-config.ts         #   Dark/light mode detection
```

### Database & config (`prisma/`)

```
prisma/
├── schema.prisma               # ★ THE DATABASE SCHEMA
│                               #   Defines every table, their fields,
│                               #   and how they relate to each other
├── seed.ts                     # Demo data script
└── dev.db                      # The actual SQLite database file
```

### Other important locations

```
public/
└── uploads/
    └── logos/                  # ★ WHERE LOGO IMAGES ARE STORED
        ├── logo-light-xxx.png  #   Light theme logo (uploaded via admin)
        ├── logo-dark-yyy.png   #   Dark theme logo
        └── logo-invoice-zzz.png #  Invoice logo
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
3. Choose payment method (Card, Bank Transfer, Cash, Mobile Money)
4. Enter amount
5. Submit

The system will generate a receipt automatically.

### 8.10 Messaging Providers

Go to `/dashboard/messages` to chat with your providers.

- Select a conversation on the left
- Type your message and click Send
- Messages can be about bookings, quotes, event details, etc.
- Attachments are supported

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

- Conversations are grouped by customer
- Send text messages
- Share files, quotes, and event details
- Customers are notified when you message them

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

- View all providers in a table
- **Filter by approval status** (Pending, Approved, All)
- **Filter by category**
- **Approve** new providers — Click "Approve" to let them start receiving bookings
- **Reject** providers if they don't meet your standards

### 10.4 Subscription Plans

Go to `/admin/subscription-plans` to manage pricing:

**The default plans:**

| Plan | Price | Services | Equipment | Bookings/mo |
|------|-------|----------|-----------|-------------|
| Free | $0/mo | 5 | 10 | 25 |
| Basic | $29/mo | 15 | 30 | 100 |
| Pro | $79/mo | 50 | 100 | 500 |
| Enterprise | $199/mo | Unlimited | Unlimited | Unlimited |

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
| 13 | **Make Payment** | Booking detail page | Customer |
| 14 | **Customer Messages** | `/dashboard/messages` | Customer |
| 15 | **Customer Documents** | `/dashboard/documents` | Customer |
| 16 | **Package Builder** | `/dashboard/packages` | Customer |
| 17 | **Budget Calculator** | `/dashboard/budget` | Customer |
| 18 | **Timeline Planner** | `/dashboard/timeline` | Customer |
| 19 | **Rate Provider** | Booking detail (after completed) | Customer |
| 20 | **Provider Dashboard** | `/provider` | Provider |
| 21 | **Manage Services** | `/provider/services` | Provider |
| 22 | **Manage Equipment** | `/provider/equipment` | Provider |
| 23 | **Availability Calendar** | `/provider/calendar` | Provider |
| 24 | **Dynamic Pricing** | Via services management | Provider |
| 25 | **Provider Bookings** | `/provider/bookings` | Provider |
| 26 | **Send Quotation** | Booking detail page | Provider |
| 27 | **Confirm/Reject Booking** | Booking detail page | Provider |
| 28 | **Provider Messages** | `/provider/messages` | Provider |
| 29 | **Provider Reviews** | `/provider/reviews` | Provider |
| 30 | **Provider Documents** | `/provider/documents` | Provider |
| 31 | **Provider Settings** | `/provider/settings` | Provider |
| 32 | **Subscription Page** | `/provider/subscription` | Provider |
| 33 | **Local System Sync** | `/provider/local-sync` | Provider |
| 34 | **Admin Dashboard** | `/admin` | Admin |
| 35 | **User Management** | `/admin/users` | Admin |
| 36 | **Provider Management** | `/admin/providers` | Admin |
| 37 | **Complaint Management** | `/admin/complaints` | Admin |
| 38 | **Subscription Plans** | `/admin/subscription-plans` | Admin |
| 39 | **Branding (Logos)** | `/admin/branding` | Admin |
| 40 | **Dark/Light Theme** | Toggle in header/sidebar | Everyone |
| 41 | **Print A4 Documents** | Document detail → "Print A4" | Customer/Provider |
| 42 | **Print Thermal Receipts** | Document detail → "Print Thermal" | Customer/Provider |
| 43 | **Invoice Auto-Generation** | Automatic on payment | System |
| 44 | **Quote Auto-Generation** | Automatic on quote sent | System |
| 45 | **Notifications** | On bookings, messages, payments | Everyone |
| 46 | **Two-Way Ratings** | After completed bookings | Customer/Provider |

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
| Message | In-app messages |
| Review | Ratings and reviews |
| Notification | User notifications |
| Complaint | Admin-handled disputes |
| AvailabilitySlot | Provider calendar dates |
| Conversation | Message thread grouping |
| Document | Quotes, invoices, receipts |
| SubscriptionPlan | Pricing tiers |
| ProviderSubscription | Provider subscription status |
| LocalSyncConfig | Local system connection settings |
| LocalSyncLog | Sync activity records |
| SystemConfig | App settings (logo paths, app name) |

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
- Run `npm install` to install dependencies
- Run `npm run db:generate` to generate the Prisma client

**"Database does not exist" error**
- Run `npm run db:push` to create the database tables

**Port 3000 already in use**
- Either close the other program using port 3000
- Or change the port: `npm run dev -- -p 3001`

**Login doesn't work with demo accounts**
- Make sure you ran `npm run db:seed` to add demo data
- Check that `.env` has the correct `DATABASE_URL`

**Pages look unstyled / no CSS**
- Make sure `npm install` was completed successfully
- Clear your browser cache (Ctrl+Shift+Delete)

**Google login shows error**
- Make sure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in `.env`
- Check that the redirect URI in Google Cloud Console matches `http://localhost:3000/api/auth/google/callback`
- Google login works on `localhost` but needs HTTPS for production

**File upload not working**
- The `public/uploads/logos/` directory must exist
- Check folder permissions — the server needs write access

**"Subscription limit reached" when adding services/equipment**
- Upgrade your plan at `/provider/subscription`
- Or ask admin to increase your plan limits at `/admin/subscription-plans`

**Emails not sending (forgot password, notifications)**
- Email sending is not yet implemented. This is a planned feature.

**How do I reset the database?**
- Delete the `prisma/dev.db` file
- Run `npm run db:push` to recreate it
- Run `npm run db:seed` to add demo data again

**How do I update to the latest version?**
- Pull the latest code: `git pull`
- Run `npm install` to update dependencies
- Run `npm run db:push` to apply any database changes

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
| View database in GUI | Run: `npm run db:studio` |
| View demo data seed | File: `prisma/seed.ts` |
| View database schema | File: `prisma/schema.prisma` |

---

*End of documentation. For questions or support, contact your system administrator.*

*Document generated from Eventicate v1.0.0*
