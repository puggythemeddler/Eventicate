import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type UserRole = "CUSTOMER" | "PROVIDER" | "ADMIN";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    return "eventicate-dev-secret-change-in-production";
  }
  return secret;
}

const JWT_SECRET = new TextEncoder().encode(getJwtSecret());

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export async function createToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("eventicate_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("eventicate_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("eventicate_token");
}

export function requireRole(user: SessionUser | null, ...roles: UserRole[]) {
  if (!user) return false;
  return roles.includes(user.role);
}
