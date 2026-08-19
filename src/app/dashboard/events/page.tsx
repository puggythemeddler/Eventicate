import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { formatDate } from "@/lib/utils";
import { EVENT_TYPES } from "@/lib/constants";
import { Calendar, MapPin, Users, Package, Plus, CalendarPlus } from "lucide-react";

type DashboardEvent = {
  id: string;
  title: string;
  eventType: string;
  status: string;
  eventDate: string;
  location: string;
  guestCount: number;
  _count: { bookings: number };
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "CUSTOMER") redirect(session.role === "PROVIDER" ? "/provider" : "/admin");

  const { search, type } = await searchParams;

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (type && type !== "ALL") params.set("type", type);
  const query = params.toString();

  let events: DashboardEvent[] = [];
  try {
    const data = await serverApi<{ events: DashboardEvent[] }>(`/api/events${query ? `?${query}` : ""}`);
    events = data.events;
  } catch {
    notFound();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-charcoal-900 dark:text-charcoal-100">
              My Events
            </h1>
            <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
              Your events are the hub for bookings, budgets, documents and suppliers.
            </p>
          </div>
          <Link href="/dashboard/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <form className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <Input
                name="search"
                placeholder="Search events..."
                defaultValue={search}
                aria-label="Search events"
              />
            </div>
            <div className="sm:w-48">
              <Select
                name="type"
                options={[
                  { value: "ALL", label: "All Types" },
                  ...EVENT_TYPES.map((t) => ({ value: t.value, label: t.label })),
                ]}
                defaultValue={type || "ALL"}
              />
            </div>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
        </Card>

        {events.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-sand text-primary-700 dark:bg-charcoal-800 dark:text-primary-300">
                <CalendarPlus className="h-7 w-7" />
              </span>
              <div>
                <CardTitle className="text-center">No events found</CardTitle>
                <p className="mx-auto mt-2 max-w-sm text-sm text-charcoal-500 dark:text-charcoal-400">
                  {search || (type && type !== "ALL")
                    ? "Try adjusting your search or filter."
                    : "Create your first event to start planning venues, services and suppliers in one place."}
                </p>
              </div>
              {!(search || (type && type !== "ALL")) && (
                <Link href="/dashboard/events/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Event
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                <Card hover className="flex h-full flex-col">
                  <div className="mb-3 flex items-start justify-between">
                    <StatusBadge status={event.status} />
                    <span className="text-xs text-charcoal-400 dark:text-charcoal-500">
                      {EVENT_TYPES.find((t) => t.value === event.eventType)?.label || event.eventType}
                    </span>
                  </div>
                  <CardTitle className="mb-3">{event.title}</CardTitle>
                  <div className="mt-auto space-y-1.5 text-sm text-charcoal-500 dark:text-charcoal-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-primary-600" />
                      {formatDate(new Date(event.eventDate))}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary-600" />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-primary-600" />
                      {event.guestCount} guests
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5 text-primary-600" />
                      {event._count.bookings} booking{event._count.bookings === 1 ? "" : "s"}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </PageContent>
    </div>
  );
}