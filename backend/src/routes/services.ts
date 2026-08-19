import { Router } from "express";
import { z } from "zod";
import type { ServiceCategory } from "@prisma/client";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { SERVICE_CATEGORIES } from "../lib/constants";
import { checkProviderCan } from "../lib/subscription";

const categoryValues = SERVICE_CATEGORIES.map((c) => c.value) as [ServiceCategory, ...ServiceCategory[]];

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(categoryValues),
  basePrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  locationCity: z.string().optional(),
  locationCountry: z.string().optional(),
  images: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(categoryValues).optional(),
  basePrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  locationCity: z.string().optional(),
  locationCountry: z.string().optional(),
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

  const services = await prisma.service.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({ services });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const canResult = await checkProviderCan(provider.id, "addService");
  if (!canResult.allowed) {
    return res.status(403).json({ error: canResult.reason });
  }

  try {
    const data = createSchema.parse(req.body);

    const service = await prisma.service.create({
      data: {
        providerId: provider.id,
        name: data.name,
        description: data.description,
        category: data.category,
        basePrice: data.basePrice,
        discountPercent: data.discountPercent,
        locationCity: data.locationCity,
        locationCountry: data.locationCountry,
        images: JSON.stringify(data.images || []),
      },
    });

    return res.status(201).json({ service });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to create service" });
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

    const service = await prisma.service.findFirst({
      where: { id: data.id, providerId: provider.id },
    });
    if (!service) return res.status(404).json({ error: "Service not found" });

    const updated = await prisma.service.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.discountPercent !== undefined && { discountPercent: data.discountPercent }),
        ...(data.locationCity !== undefined && { locationCity: data.locationCity }),
        ...(data.locationCountry !== undefined && { locationCountry: data.locationCountry }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return res.status(200).json({ service: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to update service" });
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
  if (!id) return res.status(400).json({ error: "Service ID required" });

  const service = await prisma.service.findFirst({
    where: { id, providerId: provider.id },
  });
  if (!service) return res.status(404).json({ error: "Service not found" });

  await prisma.service.delete({ where: { id } });
  return res.status(200).json({ success: true });
});

export default router;
