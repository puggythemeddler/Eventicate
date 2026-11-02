import Link from "next/link";
import Image from "next/image";
import { PublicHeader } from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { serverApi } from "@/lib/server-api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ArrowRight, CalendarDays, MapPin, Ticket } from "lucide-react";

interface TicketTypePreview {
  id: string;
  name: string;
  price: number;
  remaining: number;
}

interface PublicTicketEvent {
  id: string;
  slug: string;
  title: string;
  summary: string;
  startsAt: string;
  venueName: string;
  city: string;
  country: string;
  currency: string;
  imageUrl: string | null;
  ticketTypes: TicketTypePreview[];
}

function EventCard({ event }: { event: PublicTicketEvent }) {
  const prices = event.ticketTypes.map((type) => type.price);
  const lowest = prices.length ? Math.min(...prices) : 0;
  const available = event.ticketTypes.some((type) => type.remaining > 0);
  return (
    <article className="grid overflow-hidden rounded-xl bg-sand p-4 sm:grid-cols-[190px_1fr] sm:gap-6 md:p-5 dark:bg-charcoal-900">
      <Link href={`/tickets/${event.slug}`} className="group relative block aspect-[4/3] overflow-hidden bg-charcoal-100 sm:aspect-[5/4] dark:bg-charcoal-800">
        {event.imageUrl ? (
          // Organizer-provided event artwork; no fabricated event photography.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-end justify-between p-4 text-charcoal-700 dark:text-charcoal-200">
            <span className="font-display text-2xl font-semibold leading-tight">{event.title}</span>
            <Ticket className="mb-1 h-7 w-7 shrink-0" aria-hidden="true" />
          </div>
        )}
      </Link>
      <div className="flex min-w-0 flex-col justify-center pt-4 sm:py-1">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-500 dark:text-charcoal-400">{event.country} · {event.ticketTypes.length} ticket {event.ticketTypes.length === 1 ? "type" : "types"}</p>
        <h2 className="mt-2 font-display text-2xl font-semibold leading-tight">
          <Link href={`/tickets/${event.slug}`} className="hover:underline">{event.title}</Link>
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">{event.summary}</p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-charcoal-600 dark:text-charcoal-300">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDate(event.startsAt)}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{event.venueName}, {event.city}</span>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">{available ? lowest === 0 ? "Free tickets available" : `From ${formatCurrency(lowest, event.currency)}` : "Sold out"}</p>
          <Link href={`/tickets/${event.slug}`} className="inline-flex min-h-11 items-center gap-2 font-medium text-primary-700 hover:underline dark:text-primary-300">
            Event details <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default async function TicketsPage({ searchParams }: { searchParams: Promise<{ search?: string; country?: string }> }) {
  const params = await searchParams;
  const hasFilters = Boolean(params.search?.trim() || params.country?.trim());
  const query = new URLSearchParams();
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.country?.trim()) query.set("country", params.country.trim());
  let events: PublicTicketEvent[] = [];
  let unavailable = false;
  try {
    const response = await serverApi<{ events: PublicTicketEvent[] }>(`/api/ticketing/events${query.size ? `?${query}` : ""}`);
    events = response.events;
  } catch {
    unavailable = true;
  }

  return (
    <div className="min-h-dvh">
      <PublicHeader />
      <main>
        <header className="bg-charcoal-950 px-4 py-12 text-cream md:py-16">
          <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1fr_auto] md:items-end">
            <div className="max-w-3xl">
              <p className="text-sm font-medium text-gold-300">Eventickets · by Eventicate</p>
              <h1 className="mt-3 font-display text-4xl font-semibold leading-tight md:text-5xl">Find an event worth going to.</h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-charcoal-100">Browse public events across the region. Reserve a free ticket and keep the QR code on your phone.</p>
            </div>
            <Link href="/organizer/tickets" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gold-500 px-5 py-3 font-medium text-charcoal-950 hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500">
              Publish an event <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-4 py-8 md:py-12" aria-labelledby="upcoming-events">
          <form action="/tickets" className="mb-8 grid gap-3 rounded-xl bg-sand p-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,220px)_auto] md:p-5 dark:bg-charcoal-900">
            <label className="sr-only" htmlFor="ticket-search">Search events or cities</label>
            <input id="ticket-search" name="search" defaultValue={params.search} placeholder="Search events or cities" className="min-h-11 min-w-0 rounded-lg border border-charcoal-300 bg-white px-3 text-sm dark:border-charcoal-700 dark:bg-charcoal-900" />
            <label className="sr-only" htmlFor="ticket-country">Country</label>
            <select id="ticket-country" name="country" defaultValue={params.country || ""} className="min-h-11 rounded-lg border border-charcoal-300 bg-white px-3 text-sm dark:border-charcoal-700 dark:bg-charcoal-900">
              <option value="">All countries</option>
              {["Kenya", "Uganda", "Tanzania", "Rwanda", "Burundi", "Democratic Republic of the Congo", "South Sudan", "Somalia"].map((country) => <option key={country}>{country}</option>)}
            </select>
            <button type="submit" className="min-h-11 rounded-lg bg-charcoal-900 px-5 text-sm font-medium text-white hover:bg-charcoal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500 dark:bg-charcoal-100 dark:text-charcoal-950">Find events</button>
          </form>

          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-500 dark:text-charcoal-400">Public listings</p>
              <h2 id="upcoming-events" className="mt-1 font-display text-2xl font-semibold">Upcoming events</h2>
            </div>
            <p className="text-sm text-charcoal-600 dark:text-charcoal-300">
              {unavailable ? "Listings unavailable" : `${events.length} ${events.length === 1 ? "event" : "events"}`}
            </p>
          </div>

          {events.length > 0 ? (
            <div className="space-y-4">{events.map((event) => <EventCard key={event.id} event={event} />)}</div>
          ) : (
            <div className="flex items-center justify-between gap-5 rounded-xl bg-sand p-6 md:p-8 dark:bg-charcoal-900">
              <div className="min-w-0">
                <Ticket className="h-8 w-8 text-charcoal-500 dark:text-charcoal-400" aria-hidden="true" />
                <h3 className="mt-4 font-display text-xl font-semibold">
                  {unavailable
                    ? "Event listings are unavailable right now."
                    : hasFilters
                      ? "No events match those filters."
                      : "No public events are listed yet."}
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">
                  {unavailable
                    ? "Try loading the listings again in a moment."
                    : hasFilters
                      ? "Try a different search or country, or clear your filters to see all public listings."
                      : "Know something happening? Organizers can publish an event here. Free ticket reservations are open; paid checkout will follow after payment setup is complete."}
                </p>
                {unavailable ? (
                  <Link href="/tickets" className="mt-4 inline-flex min-h-11 items-center gap-2 font-medium text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500 dark:text-primary-300">
                    Try again <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : hasFilters ? (
                  <Link href="/tickets" className="mt-4 inline-flex min-h-11 items-center gap-2 font-medium text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500 dark:text-primary-300">
                    Clear filters <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                ) : (
                  <Link href="/organizer/tickets" className="mt-4 inline-flex min-h-11 items-center gap-2 font-medium text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500 dark:text-primary-300">
                    Publish the first event <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </div>
              {/* Eventicate's ticket companion is decorative; the state and next step remain in text. */}
              <Image src="/images/eventicate-ticket-mascot.webp" alt="" width={400} height={400} sizes="(min-width: 768px) 9rem, 7rem" className="hidden h-28 w-28 shrink-0 object-contain sm:block md:h-36 md:w-36" />
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
