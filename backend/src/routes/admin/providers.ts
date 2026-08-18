import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession, hashPassword } from "../../lib/auth";
import { sendWelcomeEmail } from "../../lib/email";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const approval = req.query.approval as string | undefined;
  const category = req.query.category as string | undefined;
  const payment = req.query.payment as string | undefined;

  const providers = await prisma.providerProfile.findMany({
    where: {
      ...(approval === "pending" ? { isApproved: false } : {}),
      ...(approval === "approved" ? { isApproved: true } : {}),
      ...(category ? { category: category as never } : {}),
      ...(payment === "paid" ? { subscription: { is: { status: "ACTIVE" } } } : {}),
      ...(payment === "unpaid"
        ? {
            OR: [
              { subscription: { is: { status: { not: "ACTIVE" } } } },
              { subscription: { is: null } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true, isActive: true } },
      subscription: { select: { status: true, currentPeriodEnd: true, plan: { select: { name: true } } } },
      _count: { select: { bookings: true, reviewsReceived: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = await prisma.providerProfile.count({
    where: { isApproved: false },
  });

  const enriched = providers.map((p) => {
    const hasPaid = p.subscription?.status === "ACTIVE";
    return {
      ...p,
      hasPaid,
      isActive: p.user.isActive,
    };
  });

  return res.status(200).json({ providers: enriched, pendingCount });
});

const createProviderSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  businessName: z.string().min(1),
  category: z.enum([
    "VENUE", "PA_SYSTEM", "CATERING", "TENTS", "TRANSPORT",
    "PHOTOGRAPHY", "VIDEOGRAPHY", "DECORATION", "ENTERTAINMENT", "OTHER",
  ]),
  description: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  isApproved: z.boolean().default(true),
});

// Admins can create a provider account manually, bypassing self-registration.
router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const data = createProviderSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(data.password);

    const provider = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: "PROVIDER",
        isVerified: true,
        providerProfile: {
          create: {
            businessName: data.businessName,
            category: data.category,
            description: data.description,
            city: data.city,
            country: data.country,
            isApproved: data.isApproved,
          },
        },
      },
      include: { providerProfile: true },
    });

    sendWelcomeEmail(provider.email, provider.firstName).catch((e) =>
      console.error("Provider welcome email failed:", e)
    );

    return res.status(201).json({
      provider: {
        id: provider.providerProfile!.id,
        userId: provider.id,
        email: provider.email,
        firstName: provider.firstName,
        lastName: provider.lastName,
        phone: provider.phone,
        businessName: provider.providerProfile!.businessName,
        category: provider.providerProfile!.category,
        city: provider.providerProfile!.city,
        country: provider.providerProfile!.country,
        isApproved: provider.providerProfile!.isApproved,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    if ((error as { code?: string }).code === "P2002") {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error("Admin create provider error:", error);
    return res.status(500).json({ error: "Failed to create provider" });
  }
});

const updateProviderSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  businessName: z.string().min(1).optional(),
  category: z
    .enum([
      "VENUE", "PA_SYSTEM", "CATERING", "TENTS", "TRANSPORT",
      "PHOTOGRAPHY", "VIDEOGRAPHY", "DECORATION", "ENTERTAINMENT", "OTHER",
    ])
    .optional(),
  description: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  isApproved: z.boolean().optional(),
});

// Edit a provider's account / profile details.
router.put("/:id", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const { id } = req.params;
    const data = updateProviderSchema.parse(req.body);

    const provider = await prisma.providerProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!provider) return res.status(404).json({ error: "Provider not found" });

    await prisma.$transaction([
      prisma.user.update({
        where: { id: provider.userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
      }),
      prisma.providerProfile.update({
        where: { id },
        data: {
          businessName: data.businessName,
          category: data.category,
          description: data.description,
          city: data.city,
          country: data.country,
          isApproved: data.isApproved,
        },
      }),
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Admin update provider error:", error);
    return res.status(500).json({ error: "Failed to update provider" });
  }
});

// Deactivate or reactivate a provider's account (blocks login).
router.patch("/:id/status", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const { id } = req.params;
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);

    const provider = await prisma.providerProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!provider) return res.status(404).json({ error: "Provider not found" });

    await prisma.user.update({
      where: { id: provider.userId },
      data: { isActive },
    });

    return res.status(200).json({ success: true, isActive });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Admin toggle provider status error:", error);
    return res.status(500).json({ error: "Failed to update provider status" });
  }
});

// Delete a provider. If they have bookings or inventory, refuse (they should
// be deactivated instead) to avoid orphaned references.
router.delete("/:id", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const { id } = req.params;

    const provider = await prisma.providerProfile.findUnique({
      where: { id },
      include: { _count: { select: { bookings: true, services: true } } },
    });
    if (!provider) return res.status(404).json({ error: "Provider not found" });

    if (provider._count.bookings > 0 || provider._count.services > 0) {
      return res.status(409).json({
        error: "Provider has bookings or services. Deactivate them instead of deleting.",
      });
    }

    await prisma.user.delete({ where: { id: provider.userId } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Admin delete provider error:", error);
    return res.status(500).json({ error: "Failed to delete provider" });
  }
});

export default router;