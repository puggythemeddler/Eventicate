import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { calculateDynamicPrice, createNotification } from "../lib/booking-engine";
import { checkProviderCan } from "../lib/subscription";
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

  const role = session.role;

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
    if (!provider.isApproved) {
      return res.status(400).json({ error: "This provider is not yet approved to accept bookings" });
    }

    // Respect the provider's plan booking limit (maxBookings).
    const planCheck = await checkProviderCan(provider.id, "createBooking");
    if (!planCheck.allowed) {
      return res.status(400).json({ error: "This provider has reached the maximum number of bookings allowed by their plan. Please try another provider." });
    }

    let basePrice = 0;
    if (data.serviceId) {
      const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
      if (service) {
        // A booking must reference a service owned by the selected provider.
        if (service.providerId !== provider.id) {
          return res.status(400).json({ error: "The selected service does not belong to this provider" });
        }
        basePrice = service.basePrice.toNumber();
      }
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

    // Atomically check availability, reserve the slot, and create the booking so
    // two customers can't claim the same provider+date. Serializable isolation
    // plus the @@unique([providerId, date]) slot constraint closes the race.
    const booking = await prisma.$transaction(
      async (tx) => {
        const dateOnly = new Date(event.eventDate);
        dateOnly.setHours(0, 0, 0, 0);
        const existingSlot = await tx.availabilitySlot.findUnique({
          where: { providerId_date: { providerId: provider.id, date: dateOnly } },
        });
        if (existingSlot && existingSlot.status !== "AVAILABLE") {
          const err = new Error("This date is no longer available for the selected provider");
          (err as Error & { status?: number }).status = 409;
          throw err;
        }

        const created = await tx.booking.create({
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

        // Reserve the slot inside the same transaction.
        await tx.availabilitySlot.upsert({
          where: { providerId_date: { providerId: provider.id, date: dateOnly } },
          create: { providerId: provider.id, date: dateOnly, status: "PENDING", bookingId: created.id },
          update: { status: "PENDING", bookingId: created.id },
        });

        return created;
      },
      { isolationLevel: "Serializable" }
    );

    sendBookingConfirmation(booking.customer.user.email, booking.customer.user.firstName, {
      id: booking.id,
      eventName: event.title,
      eventDate: event.eventDate.toISOString(),
      providerName: provider.businessName,
      totalCost: booking.quotedPrice?.toNumber() || 0,
      status: booking.status,
    }).catch((e) => console.error("Booking confirmation email failed:", e));

    sendNewBookingNotification(provider.user.email, provider.user.firstName, {
      id: booking.id,
      eventName: event.title,
      eventDate: event.eventDate.toISOString(),
      customerName: `${booking.customer.user.firstName} ${booking.customer.user.lastName}`,
      totalCost: booking.quotedPrice?.toNumber() || 0,
    }).catch((e) => console.error("New booking notification email failed:", e));

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
