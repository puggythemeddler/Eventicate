import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getGoogleTokens, getGoogleUser, GOOGLE_CONFIG } from "@/lib/google-auth";
import { createToken, setSessionCookie } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(request: NextRequest) {
  if (!GOOGLE_CONFIG.clientId) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 501 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/auth/login?error=google_auth_failed", request.url));
  }

  try {
    const tokens = await getGoogleTokens(code);
    const googleUser = await getGoogleUser(tokens);

    if (!googleUser.email) {
      return NextResponse.redirect(new URL("/auth/login?error=no_email", request.url));
    }

    let user = await prisma.user.findUnique({ where: { email: googleUser.email } });

    if (user) {
      if (!user.isActive) {
        return NextResponse.redirect(new URL("/auth/login?error=account_deactivated", request.url));
      }
    } else {
      const nameParts = googleUser.name?.split(" ") || ["Google", "User"];
      user = await prisma.user.create({
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
      });

      sendWelcomeEmail(user.email, user.firstName).catch((e) => console.error("Welcome email failed:", e));
    }

    const token = await createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    await setSessionCookie(token);

    const redirectTo =
      user.role === "ADMIN" ? "/admin" :
      user.role === "PROVIDER" ? "/provider" :
      "/dashboard";

    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (err) {
    console.error("Google auth callback error:", err);
    return NextResponse.redirect(new URL("/auth/login?error=google_auth_failed", request.url));
  }
}
