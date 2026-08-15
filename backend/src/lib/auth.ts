import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import type { UserRole } from "@prisma/client";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "eventicate-dev-secret-change-in-production"
);

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
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

export function getSessionCookieToken(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  const cookies = header.split(";");
  for (const part of cookies) {
    const [name, ...rest] = part.trim().split("=");
    if (name === "eventicate_token") return rest.join("=");
  }
  return null;
}

export async function getSession(req: Request): Promise<SessionUser | null> {
  const token = getSessionCookieToken(req);
  if (!token) return null;
  return verifyToken(token);
}

export function setSessionCookie(res: Response, token: string) {
  res.setHeader(
    "Set-Cookie",
    `eventicate_token=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`
  );
}

export function clearSessionCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    "eventicate_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
  );
}

export function requireRole(user: SessionUser | null, ...roles: UserRole[]) {
  if (!user) return false;
  return roles.includes(user.role);
}
