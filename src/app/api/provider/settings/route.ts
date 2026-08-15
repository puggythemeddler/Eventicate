import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ServiceCategory } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SERVICE_CATEGORIES } from "@/lib/constants";

const categoryValues = SERVICE_CATEGORIES.map((c) => c.value) as [ServiceCategory, ...ServiceCategory[]];

const updateSchema = z.object({
  businessName: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(categoryValues).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  logoUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  defaultDiscount: z.number().min(0).max(100).optional(),
  applyDiscountToAll: z.boolean().optional(),
  travelOutsideArea: z.boolean().optional(),
  travelRadius: z.number().int().min(0).nullable().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
    include: { user: { select: { email: true, firstName: true, lastName: true, phone: true } } },
  });

  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  return NextResponse.json({ provider });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const updated = await prisma.providerProfile.update({
      where: { id: provider.id },
      data,
    });

    return NextResponse.json({ provider: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
