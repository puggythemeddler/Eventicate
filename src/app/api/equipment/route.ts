import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";


const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(["audio", "lighting", "instruments"]),
  subcategory: z.string().min(1),
  quantity: z.number().int().min(1).default(1),
  condition: z.string().default("good"),
  description: z.string().optional(),
  rentalPrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  setupCharge: z.number().min(0).default(0),
  transportCharge: z.number().min(0).default(0),
  operatorCharge: z.number().min(0).default(0),
  images: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  category: z.enum(["audio", "lighting", "instruments"]).optional(),
  subcategory: z.string().min(1).optional(),
  quantity: z.number().int().min(1).optional(),
  condition: z.string().optional(),
  description: z.string().optional(),
  rentalPrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  setupCharge: z.number().min(0).optional(),
  transportCharge: z.number().min(0).optional(),
  operatorCharge: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const equipment = await prisma.equipment.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ equipment });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const { checkProviderCan } = await import("@/lib/subscription");
  const canResult = await checkProviderCan(provider.id, "addEquipment");
  if (!canResult.allowed) {
    return NextResponse.json({ error: canResult.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const item = await prisma.equipment.create({
      data: {
        providerId: provider.id,
        name: data.name,
        category: data.category,
        subcategory: data.subcategory,
        quantity: data.quantity,
        condition: data.condition,
        description: data.description,
        images: JSON.stringify(data.images || []),
        rentalPrice: data.rentalPrice,
        discountPercent: data.discountPercent,
        setupCharge: data.setupCharge,
        transportCharge: data.transportCharge,
        operatorCharge: data.operatorCharge,
      },
    });

    return NextResponse.json({ equipment: item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create equipment" }, { status: 500 });
  }
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

    const item = await prisma.equipment.findFirst({
      where: { id: data.id, providerId: provider.id },
    });
    if (!item) return NextResponse.json({ error: "Equipment not found" }, { status: 404 });

    const updated = await prisma.equipment.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.subcategory !== undefined && { subcategory: data.subcategory }),
        ...(data.quantity !== undefined && { quantity: data.quantity }),
        ...(data.condition !== undefined && { condition: data.condition }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.rentalPrice !== undefined && { rentalPrice: data.rentalPrice }),
        ...(data.discountPercent !== undefined && { discountPercent: data.discountPercent }),
        ...(data.setupCharge !== undefined && { setupCharge: data.setupCharge }),
        ...(data.transportCharge !== undefined && { transportCharge: data.transportCharge }),
        ...(data.operatorCharge !== undefined && { operatorCharge: data.operatorCharge }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json({ equipment: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update equipment" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Equipment ID required" }, { status: 400 });

  const item = await prisma.equipment.findFirst({
    where: { id, providerId: provider.id },
  });
  if (!item) return NextResponse.json({ error: "Equipment not found" }, { status: 404 });

  await prisma.equipment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
