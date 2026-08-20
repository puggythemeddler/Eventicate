import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
import type { SessionUser } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "eventicate-dev-secret-change-in-production"
);

const PROTECTED_PREFIXES = ["/dashboard", "/provider", "/notifications"];

async function readSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("eventicate_token")?.value;
  const session = await readSession(token);

  if (pathname === "/accept-terms") {
    if (!session) return NextResponse.redirect(new URL("/auth/login", req.url));
    if (session.termsAcceptedAt) {
      const home = session.role === "PROVIDER" ? "/provider" : session.role === "ADMIN" ? "/admin" : "/dashboard";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected) {
    if (!session) return NextResponse.redirect(new URL("/auth/login", req.url));
    if (!session.termsAcceptedAt) {
      return NextResponse.redirect(new URL("/accept-terms", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/provider/:path*", "/notifications/:path*", "/accept-terms"],
};