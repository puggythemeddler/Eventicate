import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/layout/Navigation";
import { TicketOrderForm } from "@/components/tickets/TicketOrderForm";
import { serverApi } from "@/lib/server-api";
import { formatCurrency } from "@/lib/utils";
import { CalendarDays, MapPin, Ticket } from "lucide-react";

interface TicketTypeDetail {
  id: string;
  name: string;
  description: string | null;
  price: number;
  quantity: number;
  remaining: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
}

interface TicketEventDetail {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: string;
  startsAt: string;
  endsAt: string | null;
  timeZone: string;
  venueName: string;
  location: string;
  city: string;
  country: string;
  currency: string;
  imageUrl: string | null;
  feePayer: string;
  organizer: { firstName: string; lastName: string };
  ticketTypes: TicketTypeDetail[];
}

function eventDate(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "numeric", minute: "2-digit", timeZone,
  }).format(new Date(value));
}

export default async function TicketEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let event: TicketEventDetail;
  try {
    const response = await serverApi<{ event: TicketEventDetail }>(`/api/ticketing/events/${encodeURIComponent(slug)}`);
    event = response.event;
  } catch {
    notFound();
  }
  const availablePrices = event.ticketTypes.filter((type) => type.remaining > 0).map((type) => type.price);
  const lowestPrice = availablePrices.length ? Math.min(...availablePrices) : null;

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>
        <header className="bg-charcoal-950 text-cream">
          {event.imageUrl && (
            <div className="relative h-64 overflow-hidden sm:h-80 md:h-[420px]">
              {/* Organizer-provided artwork, with a strong ink panel for the event facts. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/90 via-charcoal-950/20 to-transparent" />
            </div>
          )}
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1fr_270px] md:items-end md:py-14">
            <div>
              <p className="text-sm font-medium text-gold-300">{event.category} · {event.country}</p>
              <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold leading-tight md:text-6xl">{event.title}</h1>
              <p className="mt-4 max-w-3xl text-lg leading-relaxed text-charcoal-100">{event.summary}</p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-charcoal-100">
                <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-gold-300" aria-hidden="true" />{eventDate(event.startsAt, event.timeZone)}</span>
                <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-gold-300" aria-hidden="true" />{event.venueName}, {event.location}, {event.city}</span>
              </div>
            </div>
            <aside className="border-l border-charcoal-700 pl-5 md:justify-self-end" aria-label="Ticket price">
              <p className="text-sm text-charcoal-200">{lowestPrice === null ? "Tickets unavailable" : lowestPrice === 0 ? "Free entry" : "Tickets from"}</p>
              {lowestPrice !== null && <p className="mt-1 font-display text-3xl font-semibold">{lowestPrice === 0 ? "Free" : formatCurrency(lowestPrice, event.currency)}</p>}
              <p className="mt-1 text-xs text-charcoal-300">{event.ticketTypes.reduce((total, type) => total + type.remaining, 0)} remaining across ticket types</p>
            </aside>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-[1fr_390px] md:gap-14 md:py-14">
          <article className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-500 dark:text-charcoal-400">About this event</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">What to expect</h2>
            <div className="mt-5 whitespace-pre-line text-base leading-relaxed text-charcoal-700 dark:text-charcoal-200">{event.description}</div>
            <dl className="mt-8 grid gap-4 border-y border-charcoal-200 py-5 sm:grid-cols-2 dark:border-charcoal-800">
              <div><dt className="text-xs text-charcoal-500 dark:text-charcoal-400">Organized by</dt><dd className="mt-1 font-medium">{event.organizer.firstName} {event.organizer.lastName}</dd></div>
              <div><dt className="text-xs text-charcoal-500 dark:text-charcoal-400">Local time zone</dt><dd className="mt-1 font-medium">{event.timeZone}</dd></div>
              {event.endsAt && <div><dt className="text-xs text-charcoal-500 dark:text-charcoal-400">Ends</dt><dd className="mt-1 font-medium">{eventDate(event.endsAt, event.timeZone)}</dd></div>}
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-charcoal-500 dark:text-charcoal-400">Tickets are issued by Eventickets for this event. Contact the organizer about event-specific entry, accessibility, and cancellation questions.</p>
          </article>
          <aside className="md:sticky md:top-24 md:self-start">
            <TicketOrderForm slug={event.slug} title={event.title} currency={event.currency} ticketTypes={event.ticketTypes} />
            <div className="mt-5 flex items-start gap-3 text-xs leading-relaxed text-charcoal-500 dark:text-charcoal-400">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>Free reservations issue a unique QR code. Paid ticket checkout will be enabled after M-Pesa setup and the ticket payment flow are connected and verified.</p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
