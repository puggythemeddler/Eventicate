import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { blockAvailability, createNotification } from "@/lib/booking-engine";
import { generateQuoteFromBooking } from "@/lib/documents";
import { sendBookingStatusUpdate } from "@/lib/email";

const updateSchema = z.object({
  status: z.enum([
    "QUOTATION_SENT", "PENDING_APPROVAL", "CONFIRMED",
    "DEPOSIT_PAID", "COMPLETED", "CANCELLED", "REJECTED",
  ]).optional(),
  quotedPrice: z.number().optional(),
  finalPrice: z.number().optional(),
  depositAmount: z.number().optional(),
  providerNotes: z.string().optional(),
  quotationDetails: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        event: true,
        provider: { include: { user: true } },
        customer: { include: { user: true } },
      },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...data,
        depositPaid: data.status === "DEPOSIT_PAID" ? true : undefined,
      },
      include: { event: true, provider: true, service: true },
    });

    if (data.status === "CONFIRMED" || data.status === "DEPOSIT_PAID") {
      await blockAvailability(booking.providerId, booking.event.eventDate, id, "CONFIRMED");
    }

    if (data.status === "QUOTATION_SENT" && data.quotedPrice) {
      await generateQuoteFromBooking(id);
    }

    if (data.status) {
      const customerUser = booking.customer.user;
      sendBookingStatusUpdate(customerUser.email, customerUser.firstName, {
        id,
        eventName: booking.event.title,
        status: data.status,
      }).catch((e) => console.error("Booking status update email failed:", e));
    }

    const notifyUserId =
      session.role === "PROVIDER"
        ? booking.customer.userId
        : booking.provider.userId;

    await createNotification(
      notifyUserId,
      "BOOKING",
      "Booking Updated",
      `Booking status changed to ${data.status?.replace(/_/g, " ").toLowerCase()}`,
      session.role === "PROVIDER"
        ? `/dashboard/bookings/${id}`
        : `/provider/bookings/${id}`
    );

    return NextResponse.json({ booking: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      event: true,
      provider: true,
      customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
      service: true,
      payments: true,
      reviews: true,
    },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ booking });
}
