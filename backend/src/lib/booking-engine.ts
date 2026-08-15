import type { EventType } from "@prisma/client";
import prisma from "./prisma";

interface PricingContext {
  basePrice: number;
  eventType?: EventType;
  eventDate: Date;
  providerId: string;
  serviceId?: string;
}

export async function calculateDynamicPrice(ctx: PricingContext): Promise<number> {
  let price = ctx.basePrice;
  const dayOfWeek = ctx.eventDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const rules = await prisma.pricingRule.findMany({
    where: {
      providerId: ctx.providerId,
      isActive: true,
      OR: [
        { serviceId: ctx.serviceId ?? undefined },
        { serviceId: null },
      ],
    },
  });

  for (const rule of rules) {
    let applies = false;

    if (rule.eventType && rule.eventType === ctx.eventType) applies = true;
    if (rule.isWeekend && isWeekend) applies = true;
    if (rule.isPeakSeason && rule.seasonStart && rule.seasonEnd) {
      if (ctx.eventDate >= rule.seasonStart && ctx.eventDate <= rule.seasonEnd) {
        applies = true;
      }
    }
    if (!rule.eventType && !rule.isWeekend && !rule.isPeakSeason) applies = true;

    if (applies) {
      if (rule.modifierType === "multiplier") {
        price *= rule.priceModifier;
      } else if (rule.modifierType === "percentage") {
        price *= 1 + rule.priceModifier / 100;
      } else {
        price += rule.priceModifier;
      }
    }
  }

  return Math.round(price * 100) / 100;
}

export function calculateCateringPrice(
  basePrice: number,
  pricePerGuest: number,
  packageGuestCount: number,
  actualGuestCount: number
): number {
  if (actualGuestCount <= packageGuestCount) return basePrice;
  const extraGuests = actualGuestCount - packageGuestCount;
  return basePrice + extraGuests * pricePerGuest;
}

export async function blockAvailability(
  providerId: string,
  date: Date,
  bookingId: string,
  status: "PENDING" | "CONFIRMED" = "PENDING"
) {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  return prisma.availabilitySlot.upsert({
    where: {
      providerId_date: { providerId, date: dateOnly },
    },
    create: {
      providerId,
      date: dateOnly,
      status,
      bookingId,
    },
    update: {
      status,
      bookingId,
    },
  });
}

export async function releaseAvailability(providerId: string, date: Date) {
  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  return prisma.availabilitySlot.updateMany({
    where: { providerId, date: dateOnly },
    data: { status: "AVAILABLE", bookingId: null },
  });
}

export async function getProviderAvailability(
  providerId: string,
  month: number,
  year: number
) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);

  return prisma.availabilitySlot.findMany({
    where: {
      providerId,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  });
}

export async function createNotification(
  userId: string,
  type: "BOOKING" | "MESSAGE" | "PAYMENT" | "REVIEW" | "SYSTEM",
  title: string,
  message: string,
  link?: string
) {
  return prisma.notification.create({
    data: { userId, type, title, message, link },
  });
}
