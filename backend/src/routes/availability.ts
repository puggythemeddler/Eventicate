import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";

const slotSchema = z.object({
  date: z.string(),
  status: z.enum(["AVAILABLE", "UNAVAILABLE"]),
  notes: z.string().optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const month = parseInt((req.query.month as string | undefined) || String(new Date().getMonth()));
  const year = parseInt((req.query.year as string | undefined) || String(new Date().getFullYear()));

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      providerId: provider.id,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  });

  return res.status(200).json({ slots });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const data = slotSchema.parse(req.body);

    const dateOnly = new Date(data.date);
    dateOnly.setHours(0, 0, 0, 0);

    if (data.status === "AVAILABLE") {
      await prisma.availabilitySlot.deleteMany({
        where: { providerId: provider.id, date: dateOnly },
      });
    } else {
      await prisma.availabilitySlot.upsert({
        where: {
          providerId_date: { providerId: provider.id, date: dateOnly },
        },
        create: {
          providerId: provider.id,
          date: dateOnly,
          status: "UNAVAILABLE",
          notes: data.notes,
        },
        update: {
          status: "UNAVAILABLE",
          notes: data.notes,
        },
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to update availability" });
  }
});

export default router;
