import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { blockAvailability, calculateDynamicPrice, createNotification } from "../lib/booking-engine";

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

const router = Router();

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const data = packageSchema.parse(req.body);

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!customer) return res.status(404).json({ error: "Customer profile not found" });

    const event = await prisma.event.findFirst({
      where: { id: data.eventId, customerId: customer.id },
    });
    if (!event) return res.status(404).json({ error: "Event not found" });

    const bookings = [];

    for (const svc of data.services) {
      const provider = await prisma.providerProfile.findUnique({
        where: { id: svc.providerId },
        include: { user: true },
      });
      if (!provider) return res.status(404).json({ error: `Provider ${svc.providerId} not found` });

      const service = await prisma.service.findUnique({
        where: { id: svc.serviceId },
      });
      if (!service) return res.status(404).json({ error: `Service ${svc.serviceId} not found` });

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

    return res.status(201).json({ bookings, count: bookings.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Package creation error:", error);
    return res.status(500).json({ error: "Failed to create package" });
  }
});

export default router;
