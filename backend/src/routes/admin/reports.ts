import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const router = Router();

const COLLECTED = ["DEPOSIT_PAID", "FULLY_PAID"] as const;

async function revenueByBooking() {
  const groups = await prisma.payment.groupBy({
    by: ["bookingId"],
    where: { status: { in: [...COLLECTED] } },
    _sum: { amount: true },
  });
  const bookingIds = groups.map((g) => g.bookingId);
  const bookings = bookingIds.length
    ? await prisma.booking.findMany({
        where: { id: { in: bookingIds } },
        select: { id: true, providerId: true, customerId: true },
      })
    : [];
  const bookingMap = new Map(bookings.map((b) => [b.id, b]));
  const byProvider = new Map<string, number>();
  const byCustomer = new Map<string, number>();
  for (const g of groups) {
    const b = bookingMap.get(g.bookingId);
    if (!b) continue;
    const amount = Number(g._sum.amount ?? 0);
    byProvider.set(b.providerId, (byProvider.get(b.providerId) ?? 0) + amount);
    byCustomer.set(b.customerId, (byCustomer.get(b.customerId) ?? 0) + amount);
  }
  return { byProvider, byCustomer };
}

// Monthly trends: new users/providers, bookings, payments, and collected revenue.
router.get("/trends", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const months = 12;
  const start = new Date();
  start.setMonth(start.getMonth() - (months - 1));
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [users, providers, bookings, payments] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true, role: true } }),
    prisma.providerProfile.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.booking.findMany({ where: { createdAt: { gte: start } }, select: { createdAt: true } }),
    prisma.payment.findMany({
      where: { createdAt: { gte: start }, status: { in: [...COLLECTED] } },
      select: { createdAt: true, amount: true },
    }),
  ]);

  const buckets: Array<{ label: string; newUsers: number; newProviders: number; bookings: number; revenue: number }> = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    buckets.push({
      label: d.toLocaleString("en-US", { month: "short", year: "numeric" }),
      newUsers: 0,
      newProviders: 0,
      bookings: 0,
      revenue: 0,
    });
    const idx = months - 1 - i;
    for (const u of users) {
      const ukey = `${u.createdAt.getFullYear()}-${u.createdAt.getMonth()}`;
      if (ukey === key && u.role !== "ADMIN") buckets[idx].newUsers += 1;
    }
    for (const p of providers) {
      const pkey = `${p.createdAt.getFullYear()}-${p.createdAt.getMonth()}`;
      if (pkey === key) buckets[idx].newProviders += 1;
    }
    for (const b of bookings) {
      const bkey = `${b.createdAt.getFullYear()}-${b.createdAt.getMonth()}`;
      if (bkey === key) buckets[idx].bookings += 1;
    }
    for (const p of payments) {
      const pkey = `${p.createdAt.getFullYear()}-${p.createdAt.getMonth()}`;
      if (pkey === key) buckets[idx].revenue += Number(p.amount);
    }
  }

  return res.status(200).json({ rows: buckets, total: buckets.length, page: 1, pageSize: buckets.length, totalPages: 1 });
});

// Per-provider report: bookings, collected revenue, rating, verification.
router.get("/providers", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const search = (req.query.search as string | undefined)?.trim() || "";
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt((req.query.pageSize as string) || "25", 10) || 25));

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { businessName: { contains: search, mode: "insensitive" } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [providers, total, revenue] = await Promise.all([
    prisma.providerProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { bookings: true, reviewsReceived: true } },
      },
    }),
    prisma.providerProfile.count({ where }),
    revenueByBooking(),
  ]);

  const rows = providers.map((p) => ({
    id: p.id,
    businessName: p.businessName,
    category: p.category,
    owner: `${p.user.firstName} ${p.user.lastName}`.trim(),
    email: p.user.email,
    verificationStatus: p.verificationStatus,
    isApproved: p.isApproved,
    bookings: p._count.bookings,
    revenue: revenue.byProvider.get(p.id) ?? 0,
    rating: p.averageRating,
    reviews: p._count.reviewsReceived,
  }));

  return res.status(200).json({ rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

// Per-customer report: bookings made, total spend, account status.
router.get("/customers", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const search = (req.query.search as string | undefined)?.trim() || "";
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10) || 1);
  const pageSize = Math.min(500, Math.max(1, parseInt((req.query.pageSize as string) || "25", 10) || 25));

  const where: Record<string, unknown> = {};
  if (search) {
    where.user = {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  const [customers, total, revenue] = await Promise.all([
    prisma.customerProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { firstName: true, lastName: true, email: true, isActive: true, createdAt: true } },
        _count: { select: { bookings: true } },
      },
    }),
    prisma.customerProfile.count({ where }),
    revenueByBooking(),
  ]);

  const rows = customers.map((c) => ({
    id: c.id,
    name: `${c.user.firstName} ${c.user.lastName}`.trim(),
    email: c.user.email,
    isActive: c.user.isActive,
    bookings: c._count.bookings,
    spent: revenue.byCustomer.get(c.id) ?? 0,
    joined: c.user.createdAt,
  }));

  return res.status(200).json({ rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
});

export default router;