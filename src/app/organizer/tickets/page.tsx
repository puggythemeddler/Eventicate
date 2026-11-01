import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { OrganizerTicketWorkspace } from "@/components/tickets/OrganizerTicketWorkspace";
import { getSession } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

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

export default async function OrganizerTicketsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role === "ADMIN") notFound();

  let events: OrganizerEvent[] = [];
  let report: OrganizerReport | null = null;
  let unavailable = false;
  try {
    const [eventResponse, reportResponse] = await Promise.all([
      serverApi<{ events: OrganizerEvent[] }>("/api/ticketing/manage/events"),
      serverApi<OrganizerReport>("/api/ticketing/manage/reports"),
    ]);
    events = eventResponse.events;
    report = reportResponse;
  } catch {
    unavailable = true;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} />
      <PageContent>
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-charcoal-500 dark:text-charcoal-400">Eventickets · organizer workspace</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-charcoal-900 dark:text-charcoal-100">Your ticket events</h1>
            <p className="mt-2 max-w-2xl text-sm text-charcoal-600 dark:text-charcoal-300">Publish a public event, issue free tickets, and manage entry in the same account you use for Eventicate bookings.</p>
          </div>
          <Link href="/organizer/tickets/new"><Button><Plus className="mr-2 h-4 w-4" />Publish event</Button></Link>
        </header>
        {unavailable ? (
          <div className="border border-charcoal-200 p-6 dark:border-charcoal-800">
            <h2 className="font-medium">Ticket workspace is temporarily unavailable.</h2>
            <p className="mt-2 text-sm text-charcoal-600 dark:text-charcoal-300">Please reload in a moment. Your existing service bookings remain in the Bookings area.</p>
          </div>
        ) : (
          <OrganizerTicketWorkspace initialEvents={events} report={report} role={session.role} />
        )}
      </PageContent>
    </div>
  );
}
