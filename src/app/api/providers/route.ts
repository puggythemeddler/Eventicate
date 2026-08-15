import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseJsonArray } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const city = searchParams.get("city");
  const country = searchParams.get("country");
  const travelOutside = searchParams.get("travelOutside");

  const providers = await prisma.providerProfile.findMany({
    where: {
      isApproved: true,
      ...(category ? { category: category as never } : {}),
      ...(city ? { city: { contains: city } } : {}),
      ...(country ? { country: { contains: country } } : {}),
      ...(travelOutside === "true" ? { travelOutsideArea: true } : {}),
      ...(search
        ? {
            OR: [
              { businessName: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      services: { where: { isActive: true }, take: 3 },
      _count: { select: { reviewsReceived: true } },
    },
    orderBy: { averageRating: "desc" },
  });

  return NextResponse.json({
    providers: providers.map((p) => ({
      ...p,
      images: parseJsonArray(p.coverImageUrl ? `[${JSON.stringify(p.coverImageUrl)}]` : "[]"),
    })),
  });
}
