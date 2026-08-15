import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const bulkDiscountSchema = z.object({
  discountPercent: z.number().min(0).max(100),
});

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  try {
    const body = await request.json();
    const data = bulkDiscountSchema.parse(body);

    await prisma.service.updateMany({
      where: { providerId: provider.id, isActive: true },
      data: { discountPercent: data.discountPercent },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to apply bulk discount" }, { status: 500 });
  }
}
