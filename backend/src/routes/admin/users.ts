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

  const where: Record<string, unknown> = {};
  if (role && role !== "ALL") where.role = role;
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;
  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  const enriched = await Promise.all(
    users.map(async (u) => {
      const customer = await prisma.customerProfile.findUnique({
        where: { userId: u.id },
        include: { _count: { select: { bookings: true } } },
      });
      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        bookingCount: customer?._count?.bookings ?? 0,
      };
    })
  );

  return res.status(200).json({ users: enriched, total: enriched.length });
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
