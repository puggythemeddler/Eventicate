import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession, hashPassword } from "../../lib/auth";

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
        phone: true,
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
    phone: u.phone,
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

const userUpdateSchema = z.object({
  userId: z.string().min(1),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  role: z.enum(["CUSTOMER", "PROVIDER", "ADMIN"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
});

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const parsed = userUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }
  const { userId, firstName, lastName, email, phone, role, isActive, password } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return res.status(404).json({ error: "User not found" });

  if (userId === session.id) {
    if (role && role !== "ADMIN") {
      return res.status(400).json({ error: "You cannot change your own role" });
    }
    if (isActive === false) {
      return res.status(400).json({ error: "You cannot deactivate your own account" });
    }
  }

  if (email && email !== target.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== userId) {
      return res.status(409).json({ error: "Email is already in use" });
    }
  }

  const data: Record<string, unknown> = {};
  if (firstName !== undefined) data.firstName = firstName;
  if (lastName !== undefined) data.lastName = lastName;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (password !== undefined) data.passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    if (role === "PROVIDER") {
      await tx.providerProfile.upsert({
        where: { userId },
        create: { userId, businessName: `${target.firstName} ${target.lastName}`.trim(), category: "OTHER" },
        update: {},
      });
    } else if (role === "CUSTOMER") {
      await tx.customerProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });
    }
    return tx.user.update({
      where: { id: userId },
      data,
      select: { id: true, isActive: true, firstName: true, lastName: true, email: true, phone: true, role: true },
    });
  });

  return res.status(200).json({ user });
});

export default router;
