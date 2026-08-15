import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";
import { getProviderAvailability } from "@/lib/booking-engine";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  const provider = await prisma.providerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
      services: { where: { isActive: true } },
      venues: { where: { isActive: true } },
      equipment: { where: { isActive: true } },
      vehicles: { where: { isActive: true } },
      menuPackages: { where: { isActive: true } },
      photoPackages: { where: { isActive: true } },
      pricingRules: { where: { isActive: true } },
      reviewsReceived: {
        where: { isPublic: true },
        include: {
          customerReviewer: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  let availability = null;
  if (month && year) {
    availability = await getProviderAvailability(id, parseInt(month), parseInt(year));
  }

  return NextResponse.json({
    provider: {
      ...provider,
      equipment: provider.equipment.map((e) => ({
        ...e,
        images: parseJsonArray(e.images),
      })),
      venues: provider.venues.map((v) => ({
        ...v,
        images: parseJsonArray(v.images),
        facilities: parseJsonArray(v.facilities),
      })),
      menuPackages: provider.menuPackages.map((m) => ({
        ...m,
        menuItems: parseJsonArray(m.menuItems),
        dietaryOptions: parseJsonArray(m.dietaryOptions),
      })),
    },
    availability,
  });
}
