import { Router } from "express";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const [
    totalUsers,
    totalProviders,
    totalEvents,
    totalBookings,
    totalRevenue,
    recentBookings,
    complaints,
    popularCategories,
    pendingProviders,
    openComplaints,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.providerProfile.count({ where: { isApproved: true } }),
    prisma.event.count(),
    prisma.booking.count(),
    prisma.payment.aggregate({
      where: { status: { in: ["DEPOSIT_PAID", "FULLY_PAID"] } },
      _sum: { amount: true },
    }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        event: { select: { title: true } },
        provider: { select: { businessName: true } },
        customer: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    }),
    prisma.complaint.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.providerProfile.groupBy({
      by: ["category"],
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
    }),
    prisma.providerProfile.findMany({
      where: { isApproved: false },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.complaint.count({ where: { status: "open" } }),
  ]);

  return res.status(200).json({
    analytics: {
      totalUsers,
      totalProviders,
      totalEvents,
      totalBookings,
      totalRevenue: totalRevenue._sum.amount || 0,
      recentBookings,
      complaints,
      popularCategories,
      pendingProviders,
      openComplaints,
    },
  });
});

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const body = req.body;
  const { providerId, action } = body;

  if (action === "approve_provider") {
    await prisma.providerProfile.update({
      where: { id: providerId },
      data: { isApproved: true },
    });
    return res.status(200).json({ success: true });
  }

  if (action === "reject_provider") {
    await prisma.providerProfile.update({
      where: { id: providerId },
      data: { isApproved: false },
    });
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: "Invalid action" });
});

export default router;
