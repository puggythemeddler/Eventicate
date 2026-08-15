import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { checkProviderCan } from "../lib/subscription";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["audio", "lighting", "instruments"]),
  subcategory: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  condition: z.string().default("good"),
  description: z.string().optional(),
  rentalPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  setupCharge: z.number().min(0).default(0),
  transportCharge: z.number().min(0).default(0),
  operatorCharge: z.number().min(0).default(0),
  images: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  category: z.enum(["audio", "lighting", "instruments"]).optional(),
  subcategory: z.string().min(1).optional(),
  quantity: z.number().int().min(1).optional(),
  condition: z.string().optional(),
  description: z.string().optional(),
  rentalPrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  setupCharge: z.number().min(0).optional(),
  transportCharge: z.number().min(0).optional(),
  operatorCharge: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const equipment = await prisma.equipment.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({ equipment });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const canResult = await checkProviderCan(provider.id, "addEquipment");
  if (!canResult.allowed) {
    return res.status(403).json({ error: canResult.reason });
  }

  try {
    const data = createSchema.parse(req.body);

    const item = await prisma.equipment.create({
      data: {
        providerId: provider.id,
        name: data.name,
        category: data.category,
        subcategory: data.subcategory,
        quantity: data.quantity,
        condition: data.condition,
        description: data.description,
        images: JSON.stringify(data.images || []),
        rentalPrice: data.rentalPrice,
        discountPercent: data.discountPercent,
        setupCharge: data.setupCharge,
        transportCharge: data.transportCharge,
        operatorCharge: data.operatorCharge,
      },
    });

    return res.status(201).json({ equipment: item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to create equipment" });
  }
});

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const data = updateSchema.parse(req.body);

    const item = await prisma.equipment.findFirst({
      where: { id: data.id, providerId: provider.id },
    });
    if (!item) return res.status(404).json({ error: "Equipment not found" });

    const updated = await prisma.equipment.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.subcategory !== undefined && { subcategory: data.subcategory }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.condition !== undefined && { condition: data.condition }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.rentalPrice !== undefined && { rentalPrice: data.rentalPrice }),
        ...(data.discountPercent !== undefined && { discountPercent: data.discountPercent }),
        ...(data.setupCharge !== undefined && { setupCharge: data.setupCharge }),
        ...(data.transportCharge !== undefined && { transportCharge: data.transportCharge }),
        ...(data.operatorCharge !== undefined && { operatorCharge: data.operatorCharge }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return res.status(200).json({ equipment: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to update equipment" });
  }
});

router.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const id = req.query.id as string | undefined;
  if (!id) return res.status(400).json({ error: "Equipment ID required" });

  const item = await prisma.equipment.findFirst({
    where: { id, providerId: provider.id },
  });
  if (!item) return res.status(404).json({ error: "Equipment not found" });

  await prisma.equipment.delete({ where: { id } });
  return res.status(200).json({ success: true });
});

export default router;
