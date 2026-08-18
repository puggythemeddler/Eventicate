import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, StatusBadge } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { formatDate, formatCurrency, parseJsonArray, getCurrencyForCountry } from "@/lib/utils";
import { EVENT_TYPES, SERVICE_CATEGORIES } from "@/lib/constants";
import { EventActions } from "./EventActions";
import { Calendar, MapPin, Users, DollarSign, ArrowLeft, Search, Plus, Package, BarChart3, Clock } from "lucide-react";

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

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <Link
          href="/dashboard/events"
          className="mb-4 flex items-center gap-1 text-sm text-primary-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-2xl font-bold">{event.title}</h1>
              <StatusBadge status={event.status} />
            </div>
            <p className="text-sm text-gray-500">
              {EVENT_TYPES.find((t) => t.value === event.eventType)?.label || event.eventType}
            </p>
          </div>
<div className="flex gap-3">
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
              <Button variant="secondary" size="sm">
                <Package className="mr-2 h-4 w-4" />
                Package Builder
              </Button>
            </Link>
            <Link href={`/dashboard/budget?eventId=${event.id}`}>
              <Button variant="secondary" size="sm">
                <BarChart3 className="mr-2 h-4 w-4" />
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

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-sm font-medium">{formatDate(event.eventDate)}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-gray-500">Location</p>
                <p className="text-sm font-medium">{event.location}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-gray-500">Guests</p>
                <p className="text-sm font-medium">{event.guestCount}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-primary-600" />
              <div>
                <p className="text-xs text-gray-500">Budget</p>
                <p className="text-sm font-medium">
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
                  <Badge key={svc}>
                    {cat ? `${cat.icon} ${cat.label}` : svc}
                  </Badge>
                );
              })}
            </div>
          </Card>
        )}

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <CardTitle>Bookings ({event.bookings.length})</CardTitle>
          </div>
          {event.bookings.length === 0 ? (
            <CardDescription>No bookings yet for this event.</CardDescription>
          ) : (
            <div className="space-y-3">
              {event.bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/dashboard/bookings/${booking.id}`}
                  className="block rounded-lg border border-gray-100 p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{booking.provider.businessName}</p>
                      <p className="text-sm text-gray-500">{booking.provider.category}</p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {booking.service?.name || "General"}
                    </span>
                    {booking.quotedPrice && (
                      <span className="font-medium text-primary-600">
                        {formatCurrency(booking.quotedPrice, currency)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </PageContent>
    </div>
  );
}
