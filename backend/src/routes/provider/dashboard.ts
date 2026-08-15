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
    include: { _count: { select: { bookings: true, services: true, reviewsReceived: true } } },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const [revenueAgg, pendingBookings, recentBookings] = await Promise.all([
    prisma.payment.aggregate({
      where: {
        booking: { providerId: provider.id },
        status: { in: ["DEPOSIT_PAID", "FULLY_PAID"] },
      },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: {
        providerId: provider.id,
        status: { in: ["QUOTATION_REQUESTED", "PENDING_APPROVAL"] },
      },
    }),
    prisma.booking.findMany({
      where: { providerId: provider.id },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        event: true,
        customer: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
  ]);

  return res.status(200).json({
    businessName: provider.businessName,
    isApproved: provider.isApproved,
    averageRating: provider.averageRating,
    totalReviews: provider.totalReviews,
    totalBookings: provider._count.bookings,
    pendingBookings,
    revenue: revenueAgg._sum.amount || 0,
    recentBookings,
  });
});

export default router;
