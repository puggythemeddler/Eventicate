import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "PROVIDER") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const [reviewsReceived, reviewsGiven, completedBookingsWithoutReview] =
    await Promise.all([
      prisma.review.findMany({
        where: { providerId: provider.id, isPublic: true },
        include: {
          customerReviewer: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          booking: { select: { event: { select: { title: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.findMany({
        where: { providerReviewerId: provider.id, isPublic: false },
        include: {
          customer: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          booking: { select: { event: { select: { title: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.findMany({
        where: {
          providerId: provider.id,
          status: "COMPLETED",
          reviews: { none: { providerReviewerId: provider.id } },
        },
        include: {
          event: { select: { title: true, eventDate: true } },
          customer: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
    ]);

  return res.status(200).json({
    averageRating: provider.averageRating,
    totalReviews: provider.totalReviews,
    reviewsReceived,
    reviewsGiven,
    completedBookingsWithoutReview,
  });
});

export default router;
