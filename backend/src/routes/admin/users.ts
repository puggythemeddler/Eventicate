import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const role = req.query.role as string | undefined;
  const search = req.query.search as string | undefined;
  const isActive = req.query.isActive as string | undefined;
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt((req.query.pageSize as string) || "25", 10) || 25));

  const where: Record<string, unknown> = {};
  if (role && role !== "ALL") where.role = role;
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // Single query with a sub-count, avoiding N+1 lookups.
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        customerProfile: { select: { _count: { select: { bookings: true } } } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const enriched = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    isVerified: u.isVerified,
    createdAt: u.createdAt,
    bookingCount: u.customerProfile?._count?.bookings ?? 0,
  }));

  return res.status(200).json({
    users: enriched,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
});

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const body = req.body;
  const { userId, isActive } = body;

  if (!userId || typeof isActive !== "boolean") {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: { id: true, isActive: true, firstName: true, lastName: true, email: true, role: true },
  });

  return res.status(200).json({ user });
});

export default router;
