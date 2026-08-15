import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  trialDays: z.number().int().min(0).default(0),
  maxServices: z.number().int().min(-1).default(5),
  maxEquipment: z.number().int().min(-1).default(10),
  maxBookings: z.number().int().min(-1).default(50),
  maxVenues: z.number().int().min(-1).default(1),
  maxVehicles: z.number().int().min(-1).default(1),
  features: z.string().default("[]"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  trialDays: z.number().int().min(0).optional(),
  maxServices: z.number().int().min(-1).optional(),
  maxEquipment: z.number().int().min(-1).optional(),
  maxBookings: z.number().int().min(-1).optional(),
  maxVenues: z.number().int().min(-1).optional(),
  maxVehicles: z.number().int().min(-1).optional(),
  features: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || (session.role !== "ADMIN" && session.role !== "PROVIDER")) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return res.status(200).json({ plans });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const body = req.body;
    const data = createSchema.parse(body);

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        trialDays: data.trialDays,
        maxServices: data.maxServices,
        maxEquipment: data.maxEquipment,
        maxBookings: data.maxBookings,
        maxVenues: data.maxVenues,
        maxVehicles: data.maxVehicles,
        features: data.features,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    return res.status(201).json({ plan });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to create plan" });
  }
});

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const body = req.body;
    const data = updateSchema.parse(body);

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.id } });
    if (!plan) return res.status(404).json({ error: "Plan not found" });

    const updated = await prisma.subscriptionPlan.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
        ...(data.maxServices !== undefined && { maxServices: data.maxServices }),
        ...(data.maxEquipment !== undefined && { maxEquipment: data.maxEquipment }),
        ...(data.maxBookings !== undefined && { maxBookings: data.maxBookings }),
        ...(data.maxVenues !== undefined && { maxVenues: data.maxVenues }),
        ...(data.maxVehicles !== undefined && { maxVehicles: data.maxVehicles }),
        ...(data.features !== undefined && { features: data.features }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });

    return res.status(200).json({ plan: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to update plan" });
  }
});

router.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const id = req.query.id as string | undefined;
  if (!id) return res.status(400).json({ error: "Plan ID required" });

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) return res.status(404).json({ error: "Plan not found" });

  await prisma.subscriptionPlan.delete({ where: { id } });
  return res.status(200).json({ success: true });
});

export default router;
