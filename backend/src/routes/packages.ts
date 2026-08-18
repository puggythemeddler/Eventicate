import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { calculateDynamicPrice, createNotification } from "../lib/booking-engine";

const packageSchema = z.object({
  eventId: z.string(),
  services: z.array(
    z.object({
      providerId: z.string(),
      serviceId: z.string(),
      customerNotes: z.string().optional(),
    })
  ).min(1).max(20),
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

    const dateOnly = new Date(event.eventDate);
    dateOnly.setHours(0, 0, 0, 0);

    // Create every booking + slot reservation atomically so a mid-loop failure
    // can't leave a partially-created package. Serializable isolation closes the
    // double-booking race for each provider+date.
    const bookings = await prisma.$transaction(
      async (tx) => {
        const created = [];
        for (const svc of data.services) {
          const provider = await tx.providerProfile.findUnique({
            where: { id: svc.providerId },
            include: { user: true },
          });
          if (!provider) throw httpError(404, `Provider ${svc.providerId} not found`);

          const service = await tx.service.findUnique({
            where: { id: svc.serviceId },
          });
          if (!service) throw httpError(404, `Service ${svc.serviceId} not found`);
          if (service.providerId !== provider.id) {
            throw httpError(400, `Service ${service.name} does not belong to provider ${provider.businessName}`);
          }

          const existingSlot = await tx.availabilitySlot.findUnique({
            where: { providerId_date: { providerId: provider.id, date: dateOnly } },
          });
          if (existingSlot && existingSlot.status !== "AVAILABLE") {
            throw httpError(409, `${provider.businessName} is not available on ${event.eventDate.toISOString().split("T")[0]}`);
          }

          const quotedPrice = await calculateDynamicPrice({
            basePrice: service.basePrice.toNumber(),
            eventType: event.eventType,
            eventDate: event.eventDate,
            providerId: provider.id,
            serviceId: service.id,
          });

          const booking = await tx.booking.create({
            data: {
              eventId: data.eventId,
              customerId: customer.id,
              providerId: svc.providerId,
              serviceId: svc.serviceId,
              customerNotes: svc.customerNotes,
              quotedPrice,
              status: "QUOTATION_REQUESTED",
            },
            include: { provider: { include: { user: true } }, service: true, event: true },
          });

          await tx.availabilitySlot.upsert({
            where: { providerId_date: { providerId: provider.id, date: dateOnly } },
            create: { providerId: provider.id, date: dateOnly, status: "PENDING", bookingId: booking.id },
            update: { status: "PENDING", bookingId: booking.id },
          });

          created.push(booking);
        }
        return created;
      },
      { isolationLevel: "Serializable" }
    );

    // Notifications/emails fire after commit (side effects don't belong in the tx).
    for (const booking of bookings) {
      await createNotification(
        booking.provider.userId,
        "BOOKING",
        "New Package Booking Request",
        `Package request for ${event.title} - ${booking.service?.name || "service"}`,
        `/provider/bookings/${booking.id}`
      );
    }

    return res.status(201).json({ bookings, count: bookings.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    const status = (error as Error & { status?: number }).status;
    if (status && status < 500) {
      return res.status(status).json({ error: (error as Error).message });
    }
    console.error("Package creation error:", error);
    return res.status(500).json({ error: "Failed to create package" });
  }
});

function httpError(status: number, message: string) {
  const err = new Error(message);
  (err as Error & { status?: number }).status = status;
  return err;
}

export default router;
