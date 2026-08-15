import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import prisma from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import { EVENT_TYPES } from "@/lib/constants";
import { Calendar, MapPin, Users, Package, Plus } from "lucide-react";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "CUSTOMER") redirect(session.role === "PROVIDER" ? "/provider" : "/admin");

  const { search, type } = await searchParams;

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) redirect("/dashboard");

  const where: Record<string, unknown> = { customerId: customer.id };
  if (search) where.title = { contains: search };
  if (type && type !== "ALL") where.eventType = type;

  const events = await prisma.event.findMany({
    where,
    include: { _count: { select: { bookings: true } } },
    orderBy: { eventDate: "asc" },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Events</h1>
          <Link href="/dashboard/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <form className="flex gap-4">
            <div className="flex-1">
              <Input
                name="search"
                placeholder="Search events..."
                defaultValue={search}
              />
            </div>
            <div className="w-48">
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
            <CardTitle>No events found</CardTitle>
            <p className="mt-2 text-sm text-gray-500">
              {search || (type && type !== "ALL")
                ? "Try adjusting your search or filter."
                : "Create your first event to get started."}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Link key={event.id} href={`/dashboard/events/${event.id}`}>
                <Card hover className="h-full">
                  <div className="mb-3 flex items-start justify-between">
                    <StatusBadge status={event.status} />
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {EVENT_TYPES.find((t) => t.value === event.eventType)?.label || event.eventType}
                    </span>
                  </div>
                  <CardTitle className="mb-2">{event.title}</CardTitle>
                  <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(event.eventDate)}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {event.guestCount} guests
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="h-3.5 w-3.5" />
                      {event._count.bookings} bookings
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
