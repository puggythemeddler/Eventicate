import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { serverApi } from "@/lib/server-api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Calendar, Package, Plus } from "lucide-react";

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

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {session.firstName}!</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your events and bookings</p>
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
                <p className="text-2xl font-bold">{dashboard?.events.length || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Events</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary-600" />
              <div>
                <p className="text-2xl font-bold">{dashboard?.recentBookings.length || 0}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active Bookings</p>
              </div>
            </div>
          </Card>
          <Card>
            <Link href="/search" className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-700 font-bold">
                +
              </div>
              <div>
                <p className="font-semibold">Find Services</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Browse providers</p>
              </div>
            </Link>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardTitle className="mb-4">My Events</CardTitle>
            {dashboard?.events.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No events yet. Create your first event!</p>
            ) : (
              <div className="space-y-3">
                {dashboard?.events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/dashboard/events/${event.id}`}
                    className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(new Date(event.eventDate))} · {event.guestCount} guests
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {event._count.bookings} bookings
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-4">Recent Bookings</CardTitle>
            {dashboard?.recentBookings.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {dashboard?.recentBookings.map((booking) => (
                  <div key={booking.id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{booking.provider.businessName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{booking.event.title}</p>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                    {booking.finalPrice && (
                      <p className="mt-1 text-sm text-primary-600">
                        {formatCurrency(booking.finalPrice)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </PageContent>
    </div>
  );
}
