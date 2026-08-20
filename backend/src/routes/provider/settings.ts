import { Router } from "express";
import { z } from "zod";
import type { ServiceCategory } from "@prisma/client";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { SERVICE_CATEGORIES } from "../../lib/constants";
import { renameFolder, sanitizeFolderName, cloudinaryEnabled } from "../../lib/cloudinary";

const categoryValues = SERVICE_CATEGORIES.map((c) => c.value) as [ServiceCategory, ...ServiceCategory[]];

const updateSchema = z.object({
  businessName: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(categoryValues).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  defaultDiscount: z.number().min(0).max(100).optional(),
  applyDiscountToAll: z.boolean().optional(),
  travelOutsideArea: z.boolean().optional(),
  travelRadius: z.number().int().min(0).nullable().optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
    include: { user: { select: { email: true, firstName: true, lastName: true, phone: true } } },
  });

  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const [pricingRules, activeServices] = await Promise.all([
    prisma.pricingRule.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.service.findMany({
      where: { providerId: provider.id, isActive: true },
      select: { basePrice: true, discountPercent: true },
    }),
  ]);

  return res.status(200).json({ provider, pricingRules, activeServices });
});

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const body = req.body;
    const data = updateSchema.parse(body);

    const oldName = provider.businessName.trim();
    const newName = data.businessName?.trim();

    const updated = await prisma.providerProfile.update({
      where: { id: provider.id },
      data,
    });

    if (newName && newName !== oldName && cloudinaryEnabled()) {
      const oldFolder = sanitizeFolderName(oldName);
      const newFolder = sanitizeFolderName(newName);
      if (oldFolder !== newFolder) {
        try {
          await renameFolder(`eventicate/${oldFolder}`, `eventicate/${newFolder}`);
        } catch {
          // folder may not exist yet (no uploads) or rename conflict; ignore
        }
      }
    }

    return res.status(200).json({ provider: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to update settings" });
  }
});

export default router;
