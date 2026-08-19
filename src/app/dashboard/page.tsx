import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { serverApi } from "@/lib/server-api";
import { formatDate, formatCurrency, getCurrencyForCountry } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Calendar, Package, Plus, ArrowRight, Users } from "lucide-react";

type CustomerDashboard = {
  events: {
    id: string;
    title: string;
    eventDate: string;
    guestCount: number;
    _count: { bookings: number };
  }[];
  recentBookings: {
    id: string;
    status: string;
    finalPrice: number | null;
    provider: { businessName: string };
    event: { title: string };
  }[];
};

export default async function CustomerDashboard() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "CUSTOMER") redirect(session.role === "PROVIDER" ? "/provider" : "/admin");

  let dashboard: CustomerDashboard | undefined;
  try {
    dashboard = await serverApi<CustomerDashboard>("/api/customer/dashboard");
  } catch {
    notFound();
  }
  const currency = getCurrencyForCountry(session.country);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">
              My Events
            </h1>
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
              Plan, book and manage everything for your events.
            </p>
          </div>
          <Link href="/dashboard/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Card>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary-600" />
              <div>
                <p className="text-2xl font-bold text-charcoal-900 dark:text-charcoal-100">{dashboard?.events.length || 0}</p>
                <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Upcoming Events</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary-600" />
              <div>
                <p className="text-2xl font-bold text-charcoal-900 dark:text-charcoal-100">{dashboard?.recentBookings.length || 0}</p>
                <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Active Bookings</p>
              </div>
            </div>
          </Card>
          <Card>
            <Link href="/search" className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-charcoal-900 dark:text-charcoal-100">Find Services</p>
                <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Browse providers</p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary-600" />
            </Link>
          </Card>
        </div>

        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-charcoal-900 dark:text-charcoal-100">My Events</h2>
            <Link href="/dashboard/events" className="text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400">
              View all
            </Link>
          </div>
          {dashboard?.events.length === 0 ? (
            <Card className="border-dashed">
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
                No events yet. Create your first event to start planning.
              </p>
              <Link href="/dashboard/events/new" className="mt-3 inline-block">
                <Button variant="outline" size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Create your first event
                </Button>
              </Link>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {dashboard?.events.map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/events/${event.id}`}
                  className="group block rounded-xl border border-charcoal-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-charcoal-300 hover:shadow-lg dark:border-charcoal-800 dark:bg-charcoal-900 dark:hover:border-charcoal-700"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-lg font-semibold text-charcoal-900 group-hover:text-primary-700 dark:text-charcoal-100 dark:group-hover:text-primary-300">
                      {event.title}
                    </h3>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-charcoal-300 transition-colors group-hover:text-primary-600 dark:text-charcoal-600" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-charcoal-500 dark:text-charcoal-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {formatDate(new Date(event.eventDate))}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {event.guestCount} guests
                    </span>
                  </div>
                  <p className="mt-3 border-t border-charcoal-100 pt-3 text-sm text-charcoal-500 dark:border-charcoal-800 dark:text-charcoal-400">
                    {event._count.bookings} booking{event._count.bookings === 1 ? "" : "s"} on this event
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-charcoal-900 dark:text-charcoal-100">Recent Bookings</h2>
            <Link href="/dashboard/bookings" className="text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400">
              View all
            </Link>
          </div>
          <Card className="p-0">
            {dashboard?.recentBookings.length === 0 ? (
              <p className="p-6 text-sm text-charcoal-500 dark:text-charcoal-400">No bookings yet.</p>
            ) : (
              <div className="divide-y divide-charcoal-100 dark:divide-charcoal-800">
                {dashboard?.recentBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/dashboard/bookings/${booking.id}`}
                    className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-sand dark:hover:bg-charcoal-800"
                  >
                    <div>
                      <p className="font-medium text-charcoal-900 dark:text-charcoal-100">
                        {booking.provider.businessName}
                      </p>
                      <p className="text-sm text-charcoal-500 dark:text-charcoal-400">{booking.event.title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={booking.status} />
                      {booking.finalPrice && (
                        <span className="text-sm font-semibold text-primary-700 dark:text-primary-400">
                          {formatCurrency(booking.finalPrice, currency)}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </PageContent>
    </div>
  );
}