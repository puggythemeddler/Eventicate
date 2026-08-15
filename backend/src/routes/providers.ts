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

  const providers = await prisma.providerProfile.findMany({
    where: {
      isApproved: true,
      ...(category ? { category: category as never } : {}),
      ...(city ? { city: { contains: city } } : {}),
      ...(country ? { country: { contains: country } } : {}),
      ...(travelOutside === "true" ? { travelOutsideArea: true } : {}),
      ...(search
        ? {
            OR: [
              { businessName: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      services: { where: { isActive: true }, take: 3 },
      _count: { select: { reviewsReceived: true } },
    },
    orderBy: { averageRating: "desc" },
  });

  return res.status(200).json({
    providers: providers.map((p) => ({
      ...p,
      images: parseJsonArray(p.coverImageUrl ? `[${JSON.stringify(p.coverImageUrl)}]` : "[]"),
    })),
  });
});

export default router;
