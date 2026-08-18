import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";

const EVENT_STATUSES = ["PLANNING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

const eventSchema = z.object({
  title: z.string().min(1),
  eventType: z.enum([
    "WEDDING", "FUNERAL", "BIRTHDAY", "CORPORATE",
    "CONCERT", "CHURCH", "GRADUATION", "OTHER",
  ]),
  eventDate: z.string(),
  eventEndDate: z.string().optional(),
  location: z.string().min(1),
  guestCount: z.number().int().positive(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  description: z.string().optional(),
  requiredServices: z.array(z.string()).optional(),
  status: z.enum(EVENT_STATUSES).optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const search = req.query.search as string | undefined;
  const type = req.query.type as string | undefined;

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return res.status(404).json({ error: "Customer profile not found" });

  const events = await prisma.event.findMany({
    where: {
      customerId: customer.id,
      ...(search ? { title: { contains: search } } : {}),
      ...(type ? { eventType: type as never } : {}),
    },
    include: {
      bookings: {
        include: {
          provider: { select: { businessName: true, category: true } },
        },
      },
      _count: { select: { bookings: true } },
    },
    orderBy: { eventDate: "asc" },
  });

  return res.status(200).json({ events });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const data = eventSchema.parse(req.body);

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!customer) return res.status(404).json({ error: "Customer profile not found" });

    const event = await prisma.event.create({
      data: {
        customerId: customer.id,
        title: data.title,
        eventType: data.eventType,
        eventDate: new Date(data.eventDate),
        eventEndDate: data.eventEndDate ? new Date(data.eventEndDate) : null,
        location: data.location,
        guestCount: data.guestCount,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        description: data.description,
        requiredServices: JSON.stringify(data.requiredServices || []),
        status: data.status || "PLANNING",
      },
    });

    return res.status(201).json({ event });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to create event" });
  }
});

export default router;
