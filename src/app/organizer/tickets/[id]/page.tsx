import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { TicketCheckInScanner } from "@/components/tickets/TicketCheckInScanner";
import { getSession } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, ExternalLink } from "lucide-react";

interface ManagedTicket {
  ticketCode: string;
  status: string;
  checkedInAt: string | null;
}

interface ManagedTicketOrder {
  orderCode: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string | null;
  quantity: number;
  ticketSubtotal: number;
  status: string;
  createdAt: string;
  ticketType: { name: string };
  tickets: ManagedTicket[];
}

interface ManagedTicketEvent {
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
  status: string;
  ticketTypes: { id: string; name: string; price: number; quantity: number; sold: number }[];
  orders: ManagedTicketOrder[];
}

export default async function ManageTicketEventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role === "ADMIN") notFound();
  const { id } = await params;
  let event: ManagedTicketEvent;
  try {
    const response = await serverApi<{ event: ManagedTicketEvent }>(`/api/ticketing/manage/events/${encodeURIComponent(id)}`);
    event = response.event;
  } catch {
    notFound();
  }
  const totalCapacity = event.ticketTypes.reduce((sum, type) => sum + type.quantity, 0);
  const totalSold = event.ticketTypes.reduce((sum, type) => sum + type.sold, 0);
  const checkedIn = event.orders.flatMap((order) => order.tickets).filter((ticket) => ticket.status === "CHECKED_IN").length;
  const paidGross = event.orders.reduce((sum, order) => sum + (order.status === "PAID" ? order.ticketSubtotal : 0), 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} />
      <PageContent>
        <Link href="/organizer/tickets" className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-charcoal-600 hover:underline dark:text-charcoal-300"><ArrowLeft className="h-4 w-4" aria-hidden="true" />All ticket events</Link>
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-charcoal-500 dark:text-charcoal-400">{event.category} · {event.status.toLowerCase()}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-charcoal-900 dark:text-charcoal-100">{event.title}</h1>
            <p className="mt-2 text-sm text-charcoal-600 dark:text-charcoal-300">{formatDate(event.startsAt)} · {event.venueName}, {event.city}, {event.country}</p>
          </div>
          {event.status === "PUBLISHED" && <Link href={`/tickets/${event.slug}`} className="inline-flex min-h-11 items-center gap-2 font-medium text-primary-700 hover:underline dark:text-primary-300" target="_blank">View public event <ExternalLink className="h-4 w-4" aria-hidden="true" /></Link>}
        </header>

        <section className="mb-8 grid border-y border-charcoal-200 sm:grid-cols-4 dark:border-charcoal-800" aria-label="Event ticket report">
          <div className="py-4 sm:pr-5"><p className="text-sm text-charcoal-500 dark:text-charcoal-400">Tickets reserved</p><p className="mt-1 font-display text-2xl tabular-nums">{totalSold} <span className="text-base text-charcoal-500">/ {totalCapacity}</span></p></div>
          <div className="border-t border-charcoal-200 py-4 sm:border-l sm:border-t-0 sm:px-5 dark:border-charcoal-800"><p className="text-sm text-charcoal-500 dark:text-charcoal-400">Orders</p><p className="mt-1 font-display text-2xl tabular-nums">{event.orders.length}</p></div>
          <div className="border-t border-charcoal-200 py-4 sm:border-l sm:border-t-0 sm:px-5 dark:border-charcoal-800"><p className="text-sm text-charcoal-500 dark:text-charcoal-400">Checked in</p><p className="mt-1 font-display text-2xl tabular-nums">{checkedIn}</p></div>
          <div className="border-t border-charcoal-200 py-4 sm:border-l sm:border-t-0 sm:pl-5 dark:border-charcoal-800"><p className="text-sm text-charcoal-500 dark:text-charcoal-400">Paid ticket sales</p><p className="mt-1 font-display text-2xl tabular-nums">{formatCurrency(paidGross, event.currency)}</p><p className="text-xs text-charcoal-500 dark:text-charcoal-400">Gross ticket value</p></div>
        </section>

        {event.status === "PUBLISHED" && <div className="mb-10"><TicketCheckInScanner eventId={event.id} /></div>}

        <section aria-labelledby="ticket-type-title" className="mb-10">
          <h2 id="ticket-type-title" className="mb-3 font-display text-xl font-semibold">Ticket types</h2>
          <div className="overflow-x-auto border-y border-charcoal-200 dark:border-charcoal-800">
            <table className="w-full min-w-[580px] text-left text-sm">
              <thead><tr className="text-xs text-charcoal-500 dark:text-charcoal-400"><th className="py-3 pr-4 font-medium">Name</th><th className="px-4 py-3 text-right font-medium">Price</th><th className="px-4 py-3 text-right font-medium">Reserved</th><th className="py-3 pl-4 text-right font-medium">Remaining</th></tr></thead>
              <tbody>{event.ticketTypes.map((type) => <tr key={type.id} className="border-t border-charcoal-100 dark:border-charcoal-800"><th scope="row" className="py-3 pr-4 font-medium">{type.name}</th><td className="px-4 py-3 text-right tabular-nums">{type.price === 0 ? "Free" : formatCurrency(type.price, event.currency)}</td><td className="px-4 py-3 text-right tabular-nums">{type.sold}</td><td className="py-3 pl-4 text-right tabular-nums">{Math.max(0, type.quantity - type.sold)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="attendee-title">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 id="attendee-title" className="font-display text-xl font-semibold">Attendees and check-in</h2><p className="mt-1 text-sm text-charcoal-600 dark:text-charcoal-300">Names and contact details are visible to you as the event organizer.</p></div><span className="text-sm text-charcoal-500 dark:text-charcoal-400">{event.orders.length} reservations</span></div>
          {event.orders.length === 0 ? (
            <div className="border-y border-charcoal-200 py-8 text-sm text-charcoal-600 dark:border-charcoal-800 dark:text-charcoal-300">No reservations yet. Share the public event page when you are ready.</div>
          ) : (
            <div className="overflow-x-auto border-y border-charcoal-200 dark:border-charcoal-800">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead><tr className="text-xs text-charcoal-500 dark:text-charcoal-400"><th className="py-3 pr-4 font-medium">Attendee</th><th className="px-4 py-3 font-medium">Ticket</th><th className="px-4 py-3 text-right font-medium">Code</th><th className="px-4 py-3 font-medium">Entry</th><th className="py-3 pl-4 text-right font-medium">Reserved</th></tr></thead>
                <tbody>{event.orders.flatMap((order) => order.tickets.map((ticket, index) => <tr key={ticket.ticketCode} className="border-t border-charcoal-100 align-top dark:border-charcoal-800"><td className="py-3 pr-4"><p className="font-medium">{order.buyerName}</p><a href={`mailto:${order.buyerEmail}`} className="text-xs text-charcoal-600 hover:underline dark:text-charcoal-300">{order.buyerEmail}</a></td><td className="px-4 py-3">{order.ticketType.name} {order.quantity > 1 ? `· ${index + 1} of ${order.quantity}` : ""}</td><td className="px-4 py-3 text-right font-mono text-xs">{ticket.ticketCode}</td><td className="px-4 py-3">{ticket.status === "CHECKED_IN" ? `Checked in ${ticket.checkedInAt ? formatDateTime(ticket.checkedInAt) : ""}` : ticket.status === "VALID" ? "Not yet" : "Cancelled"}</td><td className="py-3 pl-4 text-right text-xs">{formatDateTime(order.createdAt)}</td></tr>))}</tbody>
              </table>
            </div>
          )}
        </section>
      </PageContent>
    </div>
  );
}
