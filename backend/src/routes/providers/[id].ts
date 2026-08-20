import { Router } from "express";
import prisma from "../../lib/prisma";
import { parseJsonArray } from "../../lib/utils";
import { getProviderAvailability } from "../../lib/booking-engine";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const id = (req.params as { id: string }).id;
  const month = req.query.month as string | undefined;
  const year = req.query.year as string | undefined;

  const provider = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      services: { where: { isActive: true } },
      venues: { where: { isActive: true } },
      equipment: { where: { isActive: true } },
      vehicles: { where: { isActive: true } },
      menuPackages: { where: { isActive: true } },
      photoPackages: { where: { isActive: true } },
      pricingRules: { where: { isActive: true } },
      reviewsReceived: {
        where: { isPublic: true },
        include: {
          customerReviewer: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!provider) return res.status(404).json({ error: "Provider not found" });

  let availability = null;
  if (month && year) {
    availability = await getProviderAvailability(id, parseInt(month), parseInt(year));
  }

  return res.status(200).json({
    provider: {
      ...provider,
      equipment: provider.equipment.map((e) => ({
        ...e,
        images: parseJsonArray(e.images),
      })),
      venues: provider.venues.map((v) => ({
        ...v,
        images: parseJsonArray(v.images),
        facilities: parseJsonArray(v.facilities),
      })),
      vehicles: provider.vehicles.map((v) => ({
        ...v,
        images: parseJsonArray(v.images),
      })),
      menuPackages: provider.menuPackages.map((m) => ({
        ...m,
        images: parseJsonArray(m.images),
        menuItems: parseJsonArray(m.menuItems),
        dietaryOptions: parseJsonArray(m.dietaryOptions),
      })),
      photoPackages: provider.photoPackages.map((p) => ({
        ...p,
        images: parseJsonArray(p.images),
      })),
    },
    availability,
  });
});

export default router;
