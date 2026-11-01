"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { CalendarDays, MapPin, Ticket } from "lucide-react";

interface OrganizerEvent {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  city: string;
  country: string;
  currency: string;
  status: string;
  ticketTypes: { id: string; name: string; price: number; quantity: number; sold: number }[];
  _count: { orders: number };
}

interface OrganizerReport {
  ticketSummary: { events: number; orders: number; byCurrency: { currency: string; paidTickets: number; freeTickets: number; gross: number; platformFees: number; net: number }[] };
  serviceSummary: { bookings: number; settledPayments: number };
  events: { id: string; title: string; slug: string; startsAt: string; status: string; currency: string; capacity: number; sold: number; orders: number; gross: number; fees: number; net: number }[];
}

export function OrganizerTicketWorkspace({ initialEvents, report, role }: { initialEvents: OrganizerEvent[]; report: OrganizerReport | null; role: "CUSTOMER" | "PROVIDER"; }) {
  const router = useRouter();
  const [busyEventId, setBusyEventId] = useState("");
  const [actionError, setActionError] = useState("");
  const currencyTotals = new Map<string, { paidTickets: number; freeTickets: number; gross: number; fees: number; net: number }>();
  for (const event of report?.events || []) {
    const total = currencyTotals.get(event.currency) || { paidTickets: 0, freeTickets: 0, gross: 0, fees: 0, net: 0 };
    total.gross += event.gross;
    total.fees += event.fees;
    total.net += event.net;
    currencyTotals.set(event.currency, total);
  }

  const updateEventStatus = async (event: OrganizerEvent) => {
    const status = event.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    setBusyEventId(event.id);
    setActionError("");
    try {
      const response = await fetch(`/api/ticketing/manage/events/${encodeURIComponent(event.id)}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "Could not update event status");
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not update event status");
    } finally {
      setBusyEventId("");
    }
  };
  for (const item of report?.ticketSummary.byCurrency || []) {
    const total = currencyTotals.get(item.currency) || { paidTickets: 0, freeTickets: 0, gross: 0, fees: 0, net: 0 };
    total.paidTickets += item.paidTickets;
    total.freeTickets += item.freeTickets;
    total.gross = Math.max(total.gross, item.gross);
    total.fees = Math.max(total.fees, item.platformFees);
    total.net = Math.max(total.net, item.net);
    currencyTotals.set(item.currency, total);
  }

  return (
    <div>
      <section className="mb-10" aria-labelledby="ticket-report-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-500 dark:text-charcoal-400">Reports</p>
            <h2 id="ticket-report-title" className="mt-1 font-display text-xl font-semibold">Sales and bookings, kept distinct</h2>
          </div>
          <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Amounts stay grouped by ticket currency.</p>
        </div>
        <div className="grid border-y border-charcoal-200 dark:border-charcoal-800 sm:grid-cols-3">
          <div className="py-4 sm:pr-6"><p className="text-sm text-charcoal-500 dark:text-charcoal-400">Ticket events</p><p className="mt-1 font-display text-2xl">{report?.ticketSummary.events ?? 0}</p></div>
          <div className="border-t border-charcoal-200 py-4 sm:border-l sm:border-t-0 sm:px-6 dark:border-charcoal-800"><p className="text-sm text-charcoal-500 dark:text-charcoal-400">Free tickets reserved</p><p className="mt-1 font-display text-2xl">{report?.ticketSummary.byCurrency.reduce((sum, item) => sum + item.freeTickets, 0) ?? 0}</p></div>
          <div className="border-t border-charcoal-200 py-4 sm:border-l sm:border-t-0 sm:pl-6 dark:border-charcoal-800"><p className="text-sm text-charcoal-500 dark:text-charcoal-400">Service bookings</p><p className="mt-1 font-display text-2xl">{report?.serviceSummary.bookings ?? 0}</p><Link href={role === "PROVIDER" ? "/provider/analytics" : "/dashboard/bookings"} className="mt-2 inline-flex min-h-11 items-center font-medium text-primary-700 hover:underline dark:text-primary-300">Open service {role === "PROVIDER" ? "analytics" : "bookings"}</Link></div>
        </div>
        {currencyTotals.size > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead><tr className="border-b border-charcoal-200 text-xs text-charcoal-500 dark:border-charcoal-800 dark:text-charcoal-400"><th className="py-2 pr-4 font-medium">Ticket currency</th><th className="py-2 px-4 text-right font-medium">Paid tickets</th><th className="py-2 px-4 text-right font-medium">Gross sales</th><th className="py-2 px-4 text-right font-medium">Platform fee</th><th className="py-2 pl-4 text-right font-medium">Organizer net</th></tr></thead>
              <tbody>{[...currencyTotals.entries()].map(([currency, totals]) => <tr key={currency} className="border-b border-charcoal-100 dark:border-charcoal-800"><th scope="row" className="py-3 pr-4 font-medium">{currency}</th><td className="px-4 py-3 text-right tabular-nums">{totals.paidTickets}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.gross, currency)}</td><td className="px-4 py-3 text-right tabular-nums">{formatCurrency(totals.fees, currency)}</td><td className="py-3 pl-4 text-right tabular-nums">{formatCurrency(totals.net, currency)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs leading-relaxed text-charcoal-500 dark:text-charcoal-400">Paid ticket totals stay at zero until payment checkout is enabled. Free reservations never create a platform fee. Existing service payment reports remain in the service analytics area.</p>
      </section>

      <section aria-labelledby="your-events-title">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-500 dark:text-charcoal-400">Events</p><h2 id="your-events-title" className="mt-1 font-display text-xl font-semibold">Your published and draft events</h2></div>
          <span className="text-sm text-charcoal-500 dark:text-charcoal-400">{initialEvents.length} total</span>
        </div>
        {initialEvents.length === 0 ? (
          <div className="border-y border-charcoal-200 py-10 dark:border-charcoal-800">
            <Ticket className="h-7 w-7 text-charcoal-500 dark:text-charcoal-400" aria-hidden="true" />
            <h3 className="mt-3 font-display text-lg font-semibold">No ticket events yet.</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">Publish a free event to try ticket reservations and gate check-in. Paid ticket sales will open after M-Pesa setup and the ticket payment flow are connected and verified.</p>
            <Link href="/organizer/tickets/new" className="mt-4 inline-block"><Button><span className="mr-2">+</span>Create an event</Button></Link>
          </div>
        ) : (
          <div className="divide-y divide-charcoal-200 border-y border-charcoal-200 dark:divide-charcoal-800 dark:border-charcoal-800">
            {initialEvents.map((event) => {
              const capacity = event.ticketTypes.reduce((sum, type) => sum + type.quantity, 0);
              const sold = event.ticketTypes.reduce((sum, type) => sum + type.sold, 0);
              return (
                <article key={event.id} className="grid gap-4 py-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h3 className="font-display text-lg font-semibold"><Link href={`/organizer/tickets/${event.id}`} className="hover:underline">{event.title}</Link></h3>
                      <span className="border border-charcoal-300 px-2 py-0.5 text-xs dark:border-charcoal-700">{event.status.toLowerCase()}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-charcoal-600 dark:text-charcoal-300">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDate(event.startsAt)}</span>
                      <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden="true" />{event.city}, {event.country}</span>
                      <span>{sold} / {capacity} tickets reserved</span>
                    </div>
                    <p className="mt-2 text-xs text-charcoal-500 dark:text-charcoal-400">{event._count.orders} {event._count.orders === 1 ? "order" : "orders"} · {event.ticketTypes.length} ticket {event.ticketTypes.length === 1 ? "type" : "types"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <Link href={`/organizer/tickets/${event.id}`} className="inline-flex min-h-11 items-center font-medium text-primary-700 hover:underline dark:text-primary-300">Manage tickets and entry <span className="ml-2">→</span></Link>
                    {(event.status === "DRAFT" || event.status === "PUBLISHED") && (
                      <button type="button" disabled={busyEventId === event.id} onClick={() => updateEventStatus(event)} className="inline-flex min-h-11 items-center font-medium text-charcoal-700 underline underline-offset-4 disabled:opacity-50 dark:text-charcoal-200">
                        {busyEventId === event.id ? "Saving…" : event.status === "PUBLISHED" ? "Unpublish" : "Publish"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
        {actionError && <p role="alert" className="mt-3 text-sm text-terracotta-700 dark:text-terracotta-300">{actionError}</p>}
      </section>
    </div>
  );
}
