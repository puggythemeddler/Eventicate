import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { formatCurrency, formatDate, getCurrencyForCountry } from "@/lib/utils";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { CalendarClock } from "lucide-react";

const statusOptions = [
  { value: "ALL", label: "All Statuses" },
  ...Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

interface CustomerBooking {
  id: string;
  status: string;
  quotedPrice: number | null;
  finalPrice: number | null;
  event: { title: string; eventDate: string };
  provider: { businessName: string };
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "CUSTOMER") redirect(session.role === "PROVIDER" ? "/provider" : "/admin");

  const { status } = await searchParams;

  const allBookings = (
    await serverApi<{ bookings: CustomerBooking[] }>("/api/bookings?role=CUSTOMER")
  ).bookings;
  const currency = getCurrencyForCountry(session.country);

  const bookings =
    status && status !== "ALL"
      ? allBookings.filter((b) => b.status === status)
      : allBookings;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-charcoal-900 dark:text-charcoal-100">
            My Bookings
          </h1>
          <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
            Track quotes, deposits and payments for every provider you&apos;ve booked.
          </p>
        </div>

        <Card className="mb-6">
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="sm:w-56">
              <Select
                name="status"
                options={statusOptions}
                defaultValue={status || "ALL"}
                aria-label="Filter by status"
              />
            </div>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
        </Card>

        {bookings.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-sand text-primary-700 dark:bg-charcoal-800 dark:text-primary-300">
                <CalendarClock className="h-7 w-7" />
              </span>
              <div>
                <CardTitle className="text-center">No bookings found</CardTitle>
                <p className="mx-auto mt-2 max-w-sm text-sm text-charcoal-500 dark:text-charcoal-400">
                  {status && status !== "ALL"
                    ? "No bookings match the selected status. Try a different filter."
                    : "You haven't made any bookings yet. Find providers in the marketplace to get started."}
                </p>
              </div>
              {!(status && status !== "ALL") && (
                <Link href="/search">
                  <Button>Explore the Marketplace</Button>
                </Link>
              )}
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-charcoal-200 bg-sand/50 text-left text-sm text-charcoal-500 dark:border-charcoal-800 dark:bg-charcoal-800/50 dark:text-charcoal-400">
                    <th className="px-6 py-3 font-medium">Provider</th>
                    <th className="px-6 py-3 font-medium">Event</th>
                    <th className="px-6 py-3 font-medium">Date</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 text-right font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="border-b border-charcoal-100 last:border-0 transition-colors hover:bg-sand dark:border-charcoal-800 dark:hover:bg-charcoal-800"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/bookings/${booking.id}`}
                          className="font-medium text-charcoal-900 hover:text-primary-700 dark:text-charcoal-100 dark:hover:text-primary-300"
                        >
                          {booking.provider.businessName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-charcoal-500 dark:text-charcoal-400">
                        {booking.event.title}
                      </td>
                      <td className="px-6 py-4 text-sm text-charcoal-500 dark:text-charcoal-400">
                        {formatDate(booking.event.eventDate)}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">
                        {booking.finalPrice
                          ? formatCurrency(booking.finalPrice, currency)
                          : booking.quotedPrice
                            ? formatCurrency(booking.quotedPrice, currency)
                            : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </PageContent>
    </div>
  );
}