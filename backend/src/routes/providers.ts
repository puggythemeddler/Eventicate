import { Router } from "express";
import prisma from "../lib/prisma";
import { parseJsonArray } from "../lib/utils";

const router = Router();

router.get("/", async (req, res) => {
  const category = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const city = req.query.city as string | undefined;
  const country = req.query.country as string | undefined;
  const travelOutside = req.query.travelOutside as string | undefined;
  const minPrice = parseFloat(req.query.minPrice as string);
  const maxPrice = parseFloat(req.query.maxPrice as string);
  const minRating = parseFloat(req.query.minRating as string);
  const page = Math.max(parseInt(req.query.page as string) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 12, 1), 100);
  const skip = (page - 1) * limit;

  const where = {
    isApproved: true,
    ...(category ? { category: category as never } : {}),
    ...(city ? { city: { contains: city } } : {}),
    ...(country ? { country: { contains: country } } : {}),
    ...(travelOutside === "true" ? { travelOutsideArea: true } : {}),
    ...(Number.isFinite(minRating) ? { averageRating: { gte: minRating } } : {}),
    // A provider matches the price filter when any of their active services is
    // within the requested range.
    ...(Number.isFinite(minPrice) || Number.isFinite(maxPrice)
      ? {
          services: {
            some: {
              isActive: true,
              ...(Number.isFinite(minPrice) ? { basePrice: { gte: minPrice } } : {}),
              ...(Number.isFinite(maxPrice) ? { basePrice: { lte: maxPrice } } : {}),
            },
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { businessName: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
  };

  const [providers, total] = await Promise.all([
    prisma.providerProfile.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true } },
        services: { where: { isActive: true }, take: 3 },
        _count: { select: { reviewsReceived: true } },
      },
      orderBy: { averageRating: "desc" },
      take: limit,
      skip,
    }),
    prisma.providerProfile.count({ where }),
  ]);

  return res.status(200).json({
    providers: providers.map((p) => ({
      ...p,
      images: parseJsonArray(p.coverImageUrl ? `[${JSON.stringify(p.coverImageUrl)}]` : "[]"),
    })),
    total,
    page,
    pageSize: limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
});

export default router;
