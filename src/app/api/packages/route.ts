import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { blockAvailability, calculateDynamicPrice, createNotification } from "@/lib/booking-engine";

const packageSchema = z.object({
  eventId: z.string(),
  services: z.array(
    z.object({
      providerId: z.string(),
      serviceId: z.string(),
      customerNotes: z.string().optional(),
    })
  ).min(1),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = packageSchema.parse(body);

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!customer) return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });

    const event = await prisma.event.findFirst({
      where: { id: data.eventId, customerId: customer.id },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const bookings = [];

    for (const svc of data.services) {
      const provider = await prisma.providerProfile.findUnique({
        where: { id: svc.providerId },
        include: { user: true },
      });
      if (!provider) return NextResponse.json({ error: `Provider ${svc.providerId} not found` }, { status: 404 });

      const service = await prisma.service.findUnique({
        where: { id: svc.serviceId },
      });
      if (!service) return NextResponse.json({ error: `Service ${svc.serviceId} not found` }, { status: 404 });

      const quotedPrice = await calculateDynamicPrice({
        basePrice: service.basePrice,
        eventType: event.eventType,
        eventDate: event.eventDate,
        providerId: provider.id,
        serviceId: service.id,
      });

      const booking = await prisma.booking.create({
        data: {
          eventId: data.eventId,
          customerId: customer.id,
          providerId: svc.providerId,
          serviceId: svc.serviceId,
          customerNotes: svc.customerNotes,
          quotedPrice,
          status: "QUOTATION_REQUESTED",
        },
        include: { provider: true, service: true, event: true },
      });

      await blockAvailability(provider.id, event.eventDate, booking.id, "PENDING");

      await createNotification(
        provider.userId,
        "BOOKING",
        "New Package Booking Request",
        `Package request for ${event.title} - ${service.name}`,
        `/provider/bookings/${booking.id}`
      );

      bookings.push(booking);
    }

    return NextResponse.json({ bookings, count: bookings.length }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Package creation error:", error);
    return NextResponse.json({ error: "Failed to create package" }, { status: 500 });
  }
}
