---
name: eventicate-product
description: Apply Eventicate's product context, architecture, and regional requirements when changing this repository's marketplace, event-planning, ticketing, or payment experiences.
---

# Eventicate product context

Use this skill for product changes in the Eventicate repository. First inspect the existing implementation and reuse its patterns; this skill supplies product context, not permission to expand a request.

## Product shape

Eventicate serves event organizers, service providers, and administrators, with a focus on East African markets. It has two connected user paths:

- **Plan an event:** create a private planning event, find providers, request quotes, book services, communicate, and track the budget and timeline.
- **Discover events:** Eventickets is the public ticket discovery and admission product, linked to the same organizer account and workspace.

Keep service bookings and ticket orders as separate sales streams. They may appear in one organizer workspace, but never combine totals across currencies or imply that a service booking is a ticket order.

## Current implementation and constraints

- Frontend: Next.js and TypeScript in `src/`; backend: Express and TypeScript in `backend/src/`; database schema and migrations: `backend/prisma/`.
- Service categories are represented in the Prisma `ServiceCategory` enum and the frontend `SERVICE_CATEGORIES` list in `src/lib/constants.ts`. Check filters, forms, category imagery, and backend validation when changing categories.
- Existing service categories include venues, PA/audio, catering, tents, transport, photography, videography, decoration, entertainment, and other. Equipment listings separately cover audio, instruments, lighting, and tent rentals.
- Ticket events, ticket types, orders, and admission tickets use separate Prisma models and the `/api/ticketing` routes. Free reservations issue signed QR codes, reserve inventory transactionally, and support one-time check-in.
- Paid ticket checkout is intentionally inactive. Adding M-Pesa credentials alone does not activate it: the ticket-specific payment, confirmation, and payout flow still needs to be implemented and verified.
- Eventickets commission defaults to 6%, is configurable in admin settings (0–20%), and is snapshotted on orders. Free tickets have no commission. Show any fee and who pays it clearly before activating paid checkout.
- The admin payment settings already include the M-Pesa environment, consumer key, consumer secret, passkey, shortcode, callback URL, and an optional proxy callback secret. Callback URLs must be public HTTPS. Safaricom does not send Eventicate's custom proxy header; do not make that optional proxy secret a normal setup requirement.
- Ticket-event currency options currently include KES, UGX, TZS, RWF, BIF, CDF, SSP, SOS, and USD. Core service payment handling and country-to-currency helpers cover a narrower set. Check the relevant flow before claiming a country or currency is fully payment-enabled.

## Product and interface decisions

- Build mobile-first for organizers, providers, and attendees using phones. Keep forms readable on small screens and avoid requiring large images or fast connections for core tasks.
- Use the existing design system and components. Current screens use cream and charcoal surfaces with gold, olive, and terracotta accents; check `src/app/globals.css`, shared UI components, and nearby pages before adding new tokens or patterns.
- Make location, date, currency, price, availability, and fee responsibility easy to see. Use the event's selected time zone for its dates.
- Keep copy plain and locally understandable. Support locally relevant event types and provider work without assuming that payment methods, currencies, language preferences, or regulations are identical across East African countries.
- Do not add fabricated event listings, testimonials, or provider claims to production experiences. Use organizer-provided event imagery where available.
- Avoid collecting attendee details that are not needed for reservation, entry, or organizer operations.

## Useful entry points

- `src/lib/constants.ts` — event types, service categories, and shared labels.
- `src/lib/utils.ts` and `src/hooks/useCurrency.ts` — currency formatting and country defaults.
- `src/components/layout/Navigation.tsx` — public and role-based navigation.
- `backend/prisma/schema.prisma` — domain models and enums; add schema changes with a migration.
- `backend/src/routes/ticketing.ts` — public event listing, free reservations, organizer reports, and check-in.
- `backend/src/lib/mpesa.ts` and `backend/src/routes/admin/payments.ts` — M-Pesa readiness and admin configuration.
- `src/app/admin/payments/page.tsx` — payment gateway and ticket commission settings.

## When expanding the product

Prefer finishing critical flows over adding many shallow modules. For a new provider category, update the database enum, shared labels/icons, relevant forms and filters, and any category imagery together. If categories need frequent admin changes across markets, consider moving them to managed data rather than repeatedly extending a hard-coded enum.

For regional expansion, treat each country as a distinct configuration for currency, payment rails, locations, time zones, and customer-facing terminology. Keep payment credentials in deployment or admin secret storage, never in source files or chat.
