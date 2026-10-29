import type { Prisma } from "@prisma/client";

export function cancellationError(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

export async function cancelBooking(tx: Prisma.TransactionClient, bookingId: string) {
  // Payment history and depositPaid remain evidence of funds received.
  await tx.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
  await tx.availabilitySlot.updateMany({
    where: { bookingId }, data: { status: "AVAILABLE", bookingId: null },
  });
}
