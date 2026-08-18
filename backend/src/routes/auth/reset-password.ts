import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { hashPassword } from "../../lib/auth";
import { authLimiter } from "../../lib/rate-limit";
import { hashToken } from "./forgot-password";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

const router = Router();

router.post("/", authLimiter, async (req, res) => {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    const reset = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }

    const newPasswordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.status(200).json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;