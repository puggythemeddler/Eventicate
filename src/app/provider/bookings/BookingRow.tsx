"use client";

import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface BookingRowProps {
  booking: {
    id: string;
    status: string;
    quotedPrice: number | null;
    createdAt: Date;
    event: { title: string; eventDate: Date };
    customer: { user: { firstName: string; lastName: string } };
    service: { name: string } | null;
  };
}

export function BookingRow({ booking }: BookingRowProps) {
  const router = useRouter();

  return (
    <tr
      onClick={() => router.push(`/provider/bookings/${booking.id}`)}
      className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
    >
      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">
        {booking.customer.user.firstName} {booking.customer.user.lastName}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        {booking.event.title}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        {formatDate(booking.event.eventDate)}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        {booking.service?.name || "—"}
      </td>
      <td className="px-6 py-4">
        <StatusBadge status={booking.status} />
      </td>
      <td className="px-6 py-4 text-right text-sm font-medium">
        {booking.quotedPrice ? formatCurrency(booking.quotedPrice) : "—"}
      </td>
      <td className="px-6 py-4 text-right text-xs text-gray-400 dark:text-gray-500">
        {formatDate(booking.createdAt)}
      </td>
    </tr>
  );
}
