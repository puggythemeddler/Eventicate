import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { parseJsonArray, toJsonArray } from "../lib/utils";

const entrySchema = z.object({
  time: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  providerId: z.string().optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const eventId = req.query.eventId as string | undefined;
  if (!eventId) return res.status(400).json({ error: "eventId required" });

  const event = await prisma.event.findFirst({
    where: { id: eventId },
    select: { id: true, customerId: true, timelineData: true },
  });
  if (!event) return res.status(404).json({ error: "Event not found" });

  const isOwner = event.customerId === (
    await prisma.customerProfile.findUnique({ where: { userId: session.id } })
  )?.id;

  let isProvider = false;
  if (session.role === "PROVIDER") {
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: session.id },
      select: { id: true },
    });
    isProvider = provider
      ? (await prisma.booking.count({ where: { eventId, providerId: provider.id } })) > 0
      : false;
  }
  if (!isOwner && !isProvider) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const timeline = parseJsonArray<Record<string, unknown>>(event.timelineData);
  return res.status(200).json({ timeline });
});

const saveSchema = z.object({
  eventId: z.string(),
  timeline: z.array(entrySchema),
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const data = saveSchema.parse(req.body);

    const event = await prisma.event.findFirst({
      where: { id: data.eventId },
      select: { id: true, customerId: true },
    });
    if (!event) return res.status(404).json({ error: "Event not found" });

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (event.customerId !== customer?.id) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const enriched = data.timeline.map((entry, index) => ({
      ...entry,
      id: `entry_${Date.now()}_${index}`,
      sortOrder: index,
    }));

    await prisma.event.update({
      where: { id: data.eventId },
      data: { timelineData: toJsonArray(enriched) },
    });

    return res.status(200).json({ timeline: enriched });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Timeline save error:", error);
    return res.status(500).json({ error: "Failed to save timeline" });
  }
});

export default router;
