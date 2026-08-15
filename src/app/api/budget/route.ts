import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const CATEGORY_MAP: Record<string, { model: string; priceField: string; categoryFilter: string }> = {
  VENUE: { model: "venue", priceField: "basePrice", categoryFilter: "VENUE" },
  CATERING: { model: "menuPackage", priceField: "basePrice", categoryFilter: "CATERING" },
  PA_SYSTEM: { model: "equipment", priceField: "rentalPrice", categoryFilter: "PA_SYSTEM" },
  PHOTOGRAPHY: { model: "photoPackage", priceField: "basePrice", categoryFilter: "PHOTOGRAPHY" },
  TRANSPORT: { model: "vehicle", priceField: "basePrice", categoryFilter: "TRANSPORT" },
  DECORATION: { model: "service", priceField: "basePrice", categoryFilter: "DECORATION" },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const guestCount = parseInt(searchParams.get("guestCount") || "0", 10);
  const location = searchParams.get("location");

  const estimates: Record<string, { avg: number; min: number; max: number }> = {};
  let totalAvg = 0;
  let totalMin = 0;
  let totalMax = 0;

  for (const [cat, config] of Object.entries(CATEGORY_MAP)) {

    let results: { price: number }[] = [];

    if (config.model === "venue") {
      const venues = await prisma.venue.findMany({
        where: {
          isActive: true,
          ...(location ? { location: { contains: location } } : {}),
        },
        select: { basePrice: true },
      });
      results = venues.map((v) => ({ price: v.basePrice }));
    } else if (config.model === "menuPackage") {
      const pkgs = await prisma.menuPackage.findMany({
        where: { isActive: true },
        select: { basePrice: true, pricePerGuest: true, guestCount: true },
      });
      results = pkgs.map((p) => {
        let total = p.basePrice;
        if (guestCount > p.guestCount) {
          total += (guestCount - p.guestCount) * p.pricePerGuest;
        }
        return { price: total };
      });
    } else if (config.model === "equipment") {
      const equip = await prisma.equipment.findMany({
        where: { isActive: true },
        select: { rentalPrice: true },
      });
      results = equip.map((e) => ({ price: e.rentalPrice }));
    } else if (config.model === "photoPackage") {
      const pkgs = await prisma.photoPackage.findMany({
        where: { isActive: true },
        select: { basePrice: true },
      });
      results = pkgs.map((p) => ({ price: p.basePrice }));
    } else if (config.model === "vehicle") {
      const vehicles = await prisma.vehicle.findMany({
        where: { isActive: true },
        select: { basePrice: true },
      });
      results = vehicles.map((v) => ({ price: v.basePrice }));
    } else if (config.model === "service") {
      const services = await prisma.service.findMany({
        where: { isActive: true, category: "DECORATION" },
        select: { basePrice: true },
      });
      results = services.map((s) => ({ price: s.basePrice }));
    }

    if (results.length > 0) {
      const prices = results.map((r) => r.price);
      const avg = Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      estimates[cat] = { avg, min, max };
      totalAvg += avg;
      totalMin += min;
      totalMax += max;
    } else {
      estimates[cat] = { avg: 0, min: 0, max: 0 };
    }
  }

  return NextResponse.json({
    estimates,
    total: {
      avg: Math.round(totalAvg * 100) / 100,
      min: Math.round(totalMin * 100) / 100,
      max: Math.round(totalMax * 100) / 100,
    },
  });
}
