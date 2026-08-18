import { Prisma } from "@prisma/client";

// Recursively convert Prisma Decimal instances to JS numbers so JSON responses
// keep the same shape they had when money was stored as Float.
export function stripDecimals(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (value instanceof Date) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripDecimals);
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = stripDecimals(v);
  }
  return out;
}