import type { BookingStatus } from "@prisma/client";

// Delivered services may still have an unpaid balance, but unaccepted or
// cancelled bookings must never start a new payment.
export const PAYABLE_BOOKING_STATUSES: BookingStatus[] = ["CONFIRMED", "DEPOSIT_PAID", "COMPLETED"];

export function canPayBooking(status: string): boolean {
  return PAYABLE_BOOKING_STATUSES.some((allowed) => allowed === status);
}

export function bookingStatusAfterPayment(status: BookingStatus, fullyPaid: boolean): BookingStatus {
  // Settlement is not evidence that an event has been delivered. In particular,
  // a late callback must not reopen a cancelled/rejected/completed booking.
  if (status === "CONFIRMED" && !fullyPaid) return "DEPOSIT_PAID";
  return status;
}
