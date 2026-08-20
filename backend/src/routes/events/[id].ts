import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const EVENT_STATUSES = ["PLANNING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  eventType: z.enum([
    "WEDDING", "FUNERAL", "BIRTHDAY", "CORPORATE",
    "CONCERT", "CHURCH", "GRADUATION", "OTHER",
  ]).optional(),
  eventDate: z.string().optional(),
  eventEndDate: z.string().nullable().optional(),
  location: z.string().min(1).optional(),
  guestCount: z.number().int().positive().optional(),
  budgetMin: z.number().nullable().optional(),
  budgetMax: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  requiredServices: z.array(z.string()).optional(),
  status: z.preprocess(
    (v) => (typeof v === "string" ? v.toUpperCase() : v),
    z.enum(EVENT_STATUSES).optional()
  ),
});

const router = Router({ mergeParams: true });

async function findOwnedEvent(id: string, session: { id: string }) {
  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return null;
  return prisma.event.findFirst({
    where: { id, customerId: customer.id },
  });
}

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const id = (req.params as { id: string }).id;

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return res.status(404).json({ error: "Customer profile not found" });

  const event = await prisma.event.findFirst({
    where: { id, customerId: customer.id },
    include: {
      bookings: {
        include: {
          provider: { select: { businessName: true, category: true } },
          service: true,
        },
      },
    },
  });

  if (!event) return res.status(404).json({ error: "Event not found" });

  return res.status(200).json({ event: { ...event, status: event.status.toUpperCase() } });
});

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const id = (req.params as { id: string }).id;

  try {
    const data = updateSchema.parse(req.body);

    const event = await findOwnedEvent(id, session);
    if (!event) return res.status(404).json({ error: "Event not found" });

    // A completed event is immutable to edits.
    if (event.status.toUpperCase() === "COMPLETED") {
      return res.status(400).json({ error: "A completed event cannot be edited" });
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        title: data.title,
        eventType: data.eventType,
        eventDate: data.eventDate ? new Date(data.eventDate) : undefined,
        eventEndDate: data.eventEndDate !== undefined
          ? data.eventEndDate ? new Date(data.eventEndDate) : null
          : undefined,
        location: data.location,
        guestCount: data.guestCount,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        description: data.description,
        requiredServices: data.requiredServices
          ? JSON.stringify(data.requiredServices)
          : undefined,
        status: data.status,
      },
    });

    return res.status(200).json({ event: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to update event" });
  }
});

router.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const id = (req.params as { id: string }).id;

  const event = await findOwnedEvent(id, session);
  if (!event) return res.status(404).json({ error: "Event not found" });

  const bookingCount = await prisma.booking.count({ where: { eventId: id } });
  if (bookingCount > 0) {
    return res.status(409).json({
      error: "This event has bookings attached. Cancel or complete the bookings first, or keep the event for your records.",
    });
  }

  await prisma.event.delete({ where: { id } });
  return res.status(200).json({ success: true });
});

export default router;