import { Router } from "express";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import prisma from "../../lib/prisma";
import { authLimiter } from "../../lib/rate-limit";
import { sendPasswordResetEmail } from "../../lib/email";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const router = Router();

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

router.post("/", authLimiter, async (req, res) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (user && user.isActive) {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({
          data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
        }),
      ]);

      await sendPasswordResetEmail(
        user.email,
        `${user.firstName} ${user.lastName}`,
        `${process.env.NEXT_PUBLIC_APP_URL || ""}/auth/reset-password?token=${token}`
      ).catch(() => undefined);
    }

    return res.status(200).json({ message: "If an account exists for that email, a reset link has been sent." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to send reset link" });
  }
});

export default router;