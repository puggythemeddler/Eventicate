import { Router } from "express";
import prisma from "../../lib/prisma";
import { getGoogleTokens, getGoogleUser, GOOGLE_CONFIG } from "../../lib/google-auth";
import { createToken, setSessionCookie } from "../../lib/auth";
import { sendWelcomeEmail } from "../../lib/email";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

const router = Router();

router.get("/", async (req, res) => {
  if (!GOOGLE_CONFIG.clientId) {
    return res.status(501).json({ error: "Google OAuth not configured" });
  }

  const code = req.query.code as string | undefined;
  const error = req.query.error as string | undefined;

  if (error || !code) {
    return res.redirect(303, `${APP_URL}/auth/login?error=google_auth_failed`);
  }

  try {
    const tokens = await getGoogleTokens(code);
    const googleUser = await getGoogleUser(tokens);

    if (!googleUser.email) {
      return res.redirect(303, `${APP_URL}/auth/login?error=no_email`);
    }

    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
      include: { customerProfile: true, providerProfile: true },
    });

    if (user) {
      if (!user.isActive) {
        return res.redirect(303, `${APP_URL}/auth/login?error=account_deactivated`);
      }
    } else {
      const nameParts = googleUser.name?.split(" ") || ["Google", "User"];
      const created = await prisma.user.create({
        data: {
          email: googleUser.email,
          passwordHash: "", // Google-authenticated users have no password
          firstName: googleUser.given_name || nameParts[0],
          lastName: googleUser.family_name || nameParts.slice(1).join(" ") || "User",
          avatarUrl: googleUser.picture,
          isVerified: true,
          role: "CUSTOMER",
          customerProfile: { create: {} },
        },
        include: { customerProfile: true, providerProfile: true },
      });
      user = created;

      sendWelcomeEmail(user.email, user.firstName).catch((e) => console.error("Welcome email failed:", e));
    }

    if (!user) {
      return res.redirect(303, `${APP_URL}/auth/login?error=google_auth_failed`);
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

    const redirectTo =
      user.role === "ADMIN" ? "/admin" :
      user.role === "PROVIDER" ? "/provider" :
      "/dashboard";

    return res.redirect(303, `${APP_URL}${redirectTo}`);
  } catch (err) {
    console.error("Google auth callback error:", err);
    return res.redirect(303, `${APP_URL}/auth/login?error=google_auth_failed`);
  }
});

export default router;
