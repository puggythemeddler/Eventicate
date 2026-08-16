import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { blockAvailability, calculateDynamicPrice, createNotification } from "../lib/booking-engine";
import { sendBookingConfirmation, sendNewBookingNotification } from "../lib/email";

const bookingSchema = z.object({
  eventId: z.string(),
  providerId: z.string(),
  serviceId: z.string().optional(),
  customerNotes: z.string().optional(),
  quotationDetails: z.string().optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const role = (req.query.role as string | undefined) || session.role;

  if (role === "PROVIDER") {
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!provider) return res.status(404).json({ error: "Provider not found" });

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
    return res.status(200).json({ bookings });
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return res.status(404).json({ error: "Customer not found" });

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
  return res.status(200).json({ bookings });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const data = bookingSchema.parse(req.body);

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const event = await prisma.event.findFirst({
      where: { id: data.eventId, customerId: customer.id },
    });
    if (!event) return res.status(404).json({ error: "Event not found" });

    const provider = await prisma.providerProfile.findUnique({
      where: { id: data.providerId },
      include: { user: true },
    });
    if (!provider) return res.status(404).json({ error: "Provider not found" });

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

    // Atomically check availability and create the booking so two customers
    // can't claim the same provider+date (race-free via serializable check).
    const booking = await prisma.$transaction(async (tx) => {
      const dateOnly = new Date(event.eventDate);
      dateOnly.setHours(0, 0, 0, 0);
      const existingSlot = await tx.availabilitySlot.findUnique({
        where: { providerId_date: { providerId: provider.id, date: dateOnly } },
      });
      if (existingSlot && (existingSlot.status === "CONFIRMED" || existingSlot.status === "PENDING")) {
        const err = new Error("This date is no longer available for the selected provider");
        (err as Error & { status?: number }).status = 409;
        throw err;
      }

      return tx.booking.create({
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

    return res.status(201).json({ booking });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const status = (error as Error & { status?: number }).status;
    if (status === 409) {
      return res.status(409).json({ error: (error as Error).message });
    }
    console.error("Booking error:", error);
    return res.status(500).json({ error: "Failed to create booking" });
  }
});

export default router;
