import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";

const addItemSchema = z.object({
  serviceId: z.string().optional(),
  equipmentId: z.string().optional(),
  quantity: z.number().int().positive().max(1000).default(1),
  notes: z.string().max(500).optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const items = await prisma.cartItem.findMany({
    where: { customerId: customer.id },
    include: {
      service: {
        include: { provider: true },
      },
      equipment: {
        include: { provider: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped: Record<string, { provider: { id: string; businessName: string }; items: typeof items }> = {};
  for (const item of items) {
    const provider = item.service?.provider || item.equipment?.provider;
    if (!provider) continue;
    if (!grouped[provider.id]) {
      grouped[provider.id] = { provider: { id: provider.id, businessName: provider.businessName }, items: [] };
    }
    grouped[provider.id].items.push(item);
  }

  return res.status(200).json({ items, grouped: Object.values(grouped) });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const body = req.body;
    const data = addItemSchema.parse(body);

    if (!data.serviceId && !data.equipmentId) {
      return res.status(400).json({ error: "serviceId or equipmentId required" });
    }

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    if (data.serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId },
        include: { provider: true },
      });
      if (!service) return res.status(404).json({ error: "Service not found" });
      if (!service.isActive) return res.status(400).json({ error: "Service is not active" });
    } else if (data.equipmentId) {
      const equipment = await prisma.equipment.findUnique({
        where: { id: data.equipmentId },
        include: { provider: true },
      });
      if (!equipment) return res.status(404).json({ error: "Equipment not found" });
      if (!equipment.isActive) return res.status(400).json({ error: "Equipment is not active" });
      if (data.quantity > equipment.quantity) {
        return res.status(400).json({ error: `Only ${equipment.quantity} unit(s) available` });
      }
    }

    // Dedupe: adding the same item increments quantity instead of creating a duplicate row.
    const existing = await prisma.cartItem.findFirst({
      where: {
        customerId: customer.id,
        serviceId: data.serviceId || null,
        equipmentId: data.equipmentId || null,
      },
    });

    if (existing) {
      const item = await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + data.quantity },
        include: {
          service: { include: { provider: true } },
          equipment: { include: { provider: true } },
        },
      });
      return res.status(200).json({ item });
    }

    const item = await prisma.cartItem.create({
      data: {
        customerId: customer.id,
        serviceId: data.serviceId || null,
        equipmentId: data.equipmentId || null,
        quantity: data.quantity,
        notes: data.notes,
      },
      include: {
        service: { include: { provider: true } },
        equipment: { include: { provider: true } },
      },
    });

    return res.status(201).json({ item });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to add item" });
  }
});

router.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  await prisma.cartItem.deleteMany({
    where: { customerId: customer.id },
  });

  return res.status(200).json({ success: true });
});

export default router;
