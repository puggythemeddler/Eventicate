import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { blockAvailability, calculateDynamicPrice, createNotification } from "@/lib/booking-engine";
import { sendBookingConfirmation, sendNewBookingNotification } from "@/lib/email";

const bookingSchema = z.object({
  eventId: z.string(),
  providerId: z.string(),
  serviceId: z.string().optional(),
  customerNotes: z.string().optional(),
  quotationDetails: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || session.role;

  if (role === "PROVIDER") {
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

    const bookings = await prisma.booking.findMany({
      where: { providerId: provider.id },
      include: {
        event: true,
        customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        service: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ bookings });
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const bookings = await prisma.booking.findMany({
    where: { customerId: customer.id },
    include: {
      event: true,
      provider: true,
      service: true,
      payments: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ bookings });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = bookingSchema.parse(body);

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const event = await prisma.event.findFirst({
      where: { id: data.eventId, customerId: customer.id },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const provider = await prisma.providerProfile.findUnique({
      where: { id: data.providerId },
      include: { user: true },
    });
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

    let basePrice = 0;
    if (data.serviceId) {
      const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
      if (service) basePrice = service.basePrice;
    }

    const quotedPrice = basePrice > 0
      ? await calculateDynamicPrice({
          basePrice,
          eventType: event.eventType,
          eventDate: event.eventDate,
          providerId: provider.id,
          serviceId: data.serviceId,
        })
      : null;

    const booking = await prisma.booking.create({
      data: {
        eventId: data.eventId,
        customerId: customer.id,
        providerId: data.providerId,
        serviceId: data.serviceId,
        customerNotes: data.customerNotes,
        quotationDetails: data.quotationDetails,
        quotedPrice,
        status: "QUOTATION_REQUESTED",
      },
      include: { event: true, provider: { include: { user: true } }, customer: { include: { user: true } }, service: true },
    });

    sendBookingConfirmation(booking.customer.user.email, booking.customer.user.firstName, {
      id: booking.id,
      eventName: event.title,
      eventDate: event.eventDate.toISOString(),
      providerName: provider.businessName,
      totalCost: booking.quotedPrice || 0,
      status: booking.status,
    }).catch((e) => console.error("Booking confirmation email failed:", e));

    sendNewBookingNotification(provider.user.email, provider.user.firstName, {
      id: booking.id,
      eventName: event.title,
      eventDate: event.eventDate.toISOString(),
      customerName: `${booking.customer.user.firstName} ${booking.customer.user.lastName}`,
      totalCost: booking.quotedPrice || 0,
    }).catch((e) => console.error("New booking notification email failed:", e));

    await blockAvailability(provider.id, event.eventDate, booking.id, "PENDING");

    await createNotification(
      provider.userId,
      "BOOKING",
      "New Booking Request",
      `New quotation request for ${event.title}`,
      `/provider/bookings/${booking.id}`
    );

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Booking error:", error);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
