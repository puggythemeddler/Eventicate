import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { formatDate, formatCurrency, parseJsonArray, getCurrencyForCountry } from "@/lib/utils";
import { EVENT_TYPES, SERVICE_CATEGORIES } from "@/lib/constants";
import { EventActions } from "./EventActions";
import { Calendar, MapPin, Users, Wallet, ArrowLeft, Search, Plus, Package, Clock } from "lucide-react";

interface EventData {
  id: string;
  title: string;
  status: string;
  eventType: string;
  eventDate: string;
  location: string;
  guestCount: number;
  budgetMin: number | null;
  budgetMax: number | null;
  requiredServices: string;
  bookings: Array<{
    id: string;
    status: string;
    quotedPrice: number | null;
    createdAt: string;
    provider: { businessName: string; category: string };
    service: { name: string } | null;
  }>;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "CUSTOMER") redirect(session.role === "PROVIDER" ? "/provider" : "/admin");

  const { id } = await params;

  let event: EventData | null = null;

  try {
    const data = await serverApi<{ event: EventData }>(`/api/events/${id}`);
    event = data.event;
    event.bookings = event.bookings
      .slice()
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  } catch {
    notFound();
  }

  if (!event) redirect("/dashboard/events");

  const currency = getCurrencyForCountry(session.country);
  const requiredServices = parseJsonArray<string>(event.requiredServices);
  const eventTypeLabel =
    EVENT_TYPES.find((t) => t.value === event.eventType)?.label || event.eventType;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <Link
          href="/dashboard/events"
          className="mb-5 flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline dark:text-primary-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-charcoal-900 dark:text-charcoal-100">
                {event.title}
              </h1>
              <StatusBadge status={event.status} />
            </div>
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
              {eventTypeLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/search?eventId=${event.id}`}>
              <Button variant="outline" size="sm">
                <Search className="mr-2 h-4 w-4" />
                Find Services
              </Button>
            </Link>
            <Link href={`/dashboard/bookings/new?eventId=${event.id}`}>
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Booking
              </Button>
            </Link>
            <Link href={`/dashboard/packages?eventId=${event.id}`}>
              <Button variant="primary" size="sm">
                <Package className="mr-2 h-4 w-4" />
                Package Builder
              </Button>
            </Link>
            <Link href={`/dashboard/budget?eventId=${event.id}`}>
              <Button variant="secondary" size="sm">
                <Wallet className="mr-2 h-4 w-4" />
                Budget
              </Button>
            </Link>
            <Link href={`/dashboard/timeline?eventId=${event.id}`}>
              <Button variant="secondary" size="sm">
                <Clock className="mr-2 h-4 w-4" />
                Timeline
              </Button>
            </Link>
            <EventActions eventId={event.id} status={event.status} />
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sand text-primary-700 dark:bg-charcoal-800 dark:text-primary-300">
                <Calendar className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Date</p>
                <p className="truncate text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">
                  {formatDate(event.eventDate)}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sand text-primary-700 dark:bg-charcoal-800 dark:text-primary-300">
                <MapPin className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Location</p>
                <p className="truncate text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">
                  {event.location}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sand text-primary-700 dark:bg-charcoal-800 dark:text-primary-300">
                <Users className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Guests</p>
                <p className="truncate text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">
                  {event.guestCount}
                </p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sand text-primary-700 dark:bg-charcoal-800 dark:text-primary-300">
                <Wallet className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400">Budget</p>
                <p className="truncate text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">
                  {event.budgetMin || event.budgetMax
                    ? `${event.budgetMin ? formatCurrency(event.budgetMin, currency) : formatCurrency(0, currency)} - ${event.budgetMax ? formatCurrency(event.budgetMax, currency) : "Unlimited"}`
                    : "Not set"}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {requiredServices.length > 0 && (
          <Card className="mb-8">
            <CardTitle className="mb-3">Required Services</CardTitle>
            <div className="flex flex-wrap gap-2">
              {requiredServices.map((svc) => {
                const cat = SERVICE_CATEGORIES.find((c) => c.value === svc);
                return (
                  <Badge key={svc} className="gap-1.5 px-3 py-1">
                    {cat ? <cat.icon className="h-3.5 w-3.5" /> : null}
                    {cat ? cat.label : svc}
                  </Badge>
                );
              })}
            </div>
          </Card>
        )}

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Bookings ({event.bookings.length})</CardTitle>
            <Link
              href={`/dashboard/bookings/new?eventId=${event.id}`}
              className="text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400"
            >
              Add booking
            </Link>
          </div>
          {event.bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-charcoal-300 py-10 text-center dark:border-charcoal-700">
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
                No bookings yet for this event.
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs text-charcoal-400 dark:text-charcoal-500">
                Find services in the marketplace or build a package to request quotes from providers.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Link href={`/search?eventId=${event.id}`}>
                  <Button variant="outline" size="sm">
                    <Search className="mr-1.5 h-4 w-4" />
                    Find Services
                  </Button>
                </Link>
                <Link href={`/dashboard/packages?eventId=${event.id}`}>
                  <Button size="sm">
                    <Package className="mr-1.5 h-4 w-4" />
                    Package Builder
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {event.bookings.map((booking) => {
                const catLabel =
                  SERVICE_CATEGORIES.find((c) => c.value === booking.provider.category)?.label ||
                  booking.provider.category;
                return (
                  <Link
                    key={booking.id}
                    href={`/dashboard/bookings/${booking.id}`}
                    className="block rounded-xl border border-charcoal-200 bg-white p-4 transition-colors hover:border-charcoal-300 hover:bg-sand dark:border-charcoal-800 dark:bg-charcoal-900 dark:hover:border-charcoal-700 dark:hover:bg-charcoal-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                          {initials(booking.provider.businessName)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-charcoal-900 dark:text-charcoal-100">
                            {booking.provider.businessName}
                          </p>
                          <p className="truncate text-sm text-charcoal-500 dark:text-charcoal-400">
                            {catLabel}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-charcoal-100 pt-3 text-sm dark:border-charcoal-800">
                      <span className="text-charcoal-500 dark:text-charcoal-400">
                        {booking.service?.name || "General"}
                      </span>
                      {booking.quotedPrice && (
                        <span className="font-semibold text-primary-700 dark:text-primary-400">
                          {formatCurrency(booking.quotedPrice, currency)}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </PageContent>
    </div>
  );
}