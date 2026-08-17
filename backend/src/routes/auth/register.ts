import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { hashPassword, createToken, setSessionCookie } from "../../lib/auth";
import { sendWelcomeEmail } from "../../lib/email";
import { authLimiter } from "../../lib/rate-limit";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "PROVIDER"]).default("CUSTOMER"),
  businessName: z.string().optional(),
  category: z
    .enum([
      "VENUE", "PA_SYSTEM", "CATERING", "TENTS", "TRANSPORT",
      "PHOTOGRAPHY", "VIDEOGRAPHY", "DECORATION", "ENTERTAINMENT", "OTHER",
    ])
    .optional(),
});

const router = Router();

router.post("/", authLimiter, async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(data.password);

    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role,
          ...(data.role === "CUSTOMER"
            ? { customerProfile: { create: {} } }
            : {
                providerProfile: {
                  create: {
                    businessName: data.businessName || `${data.firstName}'s Business`,
                    category: data.category || "OTHER",
                  },
                },
              }),
        },
        include: { customerProfile: true, providerProfile: true },
      });
    } catch (err) {
      // Unique violation (P2002) = email already taken. Return the same generic
      // error as other failures to avoid account enumeration.
      if ((err as { code?: string }).code === "P2002") {
        return res.status(409).json({ error: "Email already registered" });
      }
      throw err;
    }

    const token = await createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      country: user.customerProfile?.country ?? user.providerProfile?.country ?? null,
    });

    setSessionCookie(res, token);

    sendWelcomeEmail(user.email, user.firstName).catch((e) => console.error("Welcome email failed:", e));

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        country: user.customerProfile?.country ?? user.providerProfile?.country ?? null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Register error:", error);
    return res.status(500).json({ error: "Registration failed" });
  }
});

export default router;
