import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import prisma from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";

const statusOptions = [
  { value: "ALL", label: "All Statuses" },
  ...Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "CUSTOMER") redirect(session.role === "PROVIDER" ? "/provider" : "/admin");

  const { status } = await searchParams;

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) redirect("/dashboard");

  const where: Record<string, unknown> = { customerId: customer.id };
  if (status && status !== "ALL") where.status = status;

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      event: { select: { title: true, eventDate: true } },
      provider: { select: { businessName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">My Bookings</h1>
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
                : "You haven't made any bookings yet."}
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-6 py-3 font-medium">Provider</th>
                  <th className="px-6 py-3 font-medium">Event</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/bookings/${booking.id}`}
                        className="font-medium text-gray-900 hover:text-primary-600 dark:text-gray-100"
                      >
                        {booking.provider.businessName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {booking.event.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(booking.event.eventDate)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {booking.finalPrice
                        ? formatCurrency(booking.finalPrice)
                        : booking.quotedPrice
                          ? formatCurrency(booking.quotedPrice)
                          : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </PageContent>
    </div>
  );
}
