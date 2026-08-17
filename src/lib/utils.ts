import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  KENYA: "KES",
  KEN: "KES",
  UGANDA: "UGX",
  UGA: "UGX",
  TANZANIA: "TZS",
  TZA: "TZS",
};

export function getCurrencyForCountry(country?: string | null): string {
  if (!country) return "KES";
  const key = country.trim().toUpperCase();
  return CURRENCY_BY_COUNTRY[key] || "KES";
}

export function formatCurrency(amount: number, currency = "KES") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function parseJsonArray<T>(json: string, fallback: T[] = []): T[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function toJsonArray(arr: unknown[]): string {
  return JSON.stringify(arr);
}

export function calculateAverageRating(ratings: (number | null | undefined)[]): number {
  const valid = ratings.filter((r): r is number => r != null && r > 0);
  if (valid.length === 0) return 0;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}
