import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const router = Router();

const MONTH_FORMAT = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" });

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "PROVIDER") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const months = Math.min(Math.max(Number(req.query.months) || 6, 1), 24);
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const [payments, bookings, bookingCounts, topServices] = await Promise.all([
    prisma.payment.findMany({
      where: {
        booking: { providerId: provider.id },
        status: { in: ["DEPOSIT_PAID", "FULLY_PAID"] },
        paidAt: { gte: since },
      },
      select: { amount: true, paidAt: true },
    }),
    prisma.booking.findMany({
      where: { providerId: provider.id, createdAt: { gte: since } },
      select: {
        status: true,
        quotedPrice: true,
        finalPrice: true,
        createdAt: true,
      },
    }),
    prisma.booking.groupBy({
      by: ["status"],
      where: { providerId: provider.id },
      _count: { id: true },
    }),
    prisma.bookingItem.groupBy({
      by: ["serviceId"],
      where: { booking: { providerId: provider.id } },
      _count: { id: true },
      _sum: { unitPrice: true },
    }),
  ]);

  const monthlyRevenue: { month: string; revenue: number }[] = [];
  for (let i = 0; i < months; i++) {
    const date = new Date(since.getFullYear(), since.getMonth() + i, 1);
    monthlyRevenue.push({ month: MONTH_FORMAT.format(date), revenue: 0 });
  }
  const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
  const indexByKey = new Map(monthlyRevenue.map((m, i) => [monthKey(new Date(since.getFullYear(), since.getMonth() + i, 1)), i]));
  for (const p of payments) {
    if (!p.paidAt) continue;
    const idx = indexByKey.get(monthKey(new Date(p.paidAt)));
    if (idx !== undefined) monthlyRevenue[idx].revenue += p.amount.toNumber();
  }

  const countBy = (statuses: string[]) =>
    bookingCounts.filter((b) => statuses.includes(b.status)).reduce((sum, b) => sum + b._count.id, 0);

  const totalRevenue = payments.reduce((s, p) => s + p.amount.toNumber(), 0);
  const completedBookings = countBy(["COMPLETED"]);
  const cancelledBookings = countBy(["CANCELLED", "REJECTED"]);

  const avgValuePayments = payments.length ? totalRevenue / payments.length : 0;
  const topServicesWithNames = await prisma.service.findMany({
    where: { id: { in: topServices.map((t) => t.serviceId).filter(Boolean) as string[] } },
    select: { id: true, name: true },
  });

  const serviceName = new Map(topServicesWithNames.map((s) => [s.id, s.name]));
  const topServicesResult = topServices
    .filter((t) => t.serviceId)
    .sort((a, b) => b._count.id - a._count.id)
    .slice(0, 5)
    .map((t) => ({
      serviceId: t.serviceId,
      name: serviceName.get(t.serviceId as string) || "Unknown",
      bookings: t._count.id,
      revenue: t._sum.unitPrice?.toNumber() ?? 0,
    }));

  return res.json({
    summary: {
      totalRevenue,
      totalBookings: bookings.length,
      completedBookings,
      cancelledBookings,
      avgBookingValue: bookings.length ? avgValuePayments : 0,
      avgRating: provider.averageRating,
      totalReviews: provider.totalReviews,
    },
    monthlyRevenue,
    bookingsByStatus: bookingCounts.map((b) => ({ status: b.status, count: b._count.id })),
    topServices: topServicesResult,
  });
});

export default router;