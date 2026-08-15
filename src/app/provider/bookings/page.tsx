import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { serverApi } from "@/lib/server-api";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { BookingRow } from "./BookingRow";

const statusOptions = [
  { value: "ALL", label: "All Statuses" },
  ...Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

interface ProviderBooking {
  id: string;
  status: string;
  quotedPrice: number | null;
  createdAt: Date;
  event: { title: string; eventDate: Date };
  customer: { user: { firstName: string; lastName: string } };
  service: { name: string } | null;
}

export default async function ProviderBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") redirect("/auth/login");

  const { status } = await searchParams;

  const allBookings = (
    await serverApi<{ bookings: ProviderBooking[] }>("/api/bookings?role=PROVIDER")
  ).bookings;

  const pendingCount = allBookings.filter(
    (b) => b.status === "QUOTATION_REQUESTED" || b.status === "PENDING_APPROVAL"
  ).length;

  const bookings =
    status && status !== "ALL"
      ? allBookings.filter((b) => b.status === status)
      : allBookings;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Bookings</h1>
          {pendingCount > 0 && (
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
              {pendingCount} pending
            </span>
          )}
        </div>

        <Card className="mb-6">
          <form className="flex gap-4">
            <div className="w-56">
              <Select
                name="status"
                options={statusOptions}
                defaultValue={status || "ALL"}
              />
            </div>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
        </Card>

        {bookings.length === 0 ? (
          <Card>
            <CardTitle>No bookings found</CardTitle>
            <p className="mt-2 text-sm text-gray-500">
              {status && status !== "ALL"
                ? "No bookings match the selected status."
                : "You haven't received any bookings yet."}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-6 py-3 font-medium">Customer</th>
                  <th className="px-6 py-3 font-medium">Event</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Service</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Price</th>
                  <th className="px-6 py-3 font-medium text-right">Created</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </PageContent>
    </div>
  );
}
