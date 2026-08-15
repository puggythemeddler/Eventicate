import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  trialDays: z.number().int().min(0).default(0),
  maxServices: z.number().int().min(-1).default(5),
  maxEquipment: z.number().int().min(-1).default(10),
  maxBookings: z.number().int().min(-1).default(50),
  maxVenues: z.number().int().min(-1).default(1),
  maxVehicles: z.number().int().min(-1).default(1),
  features: z.string().default("[]"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  trialDays: z.number().int().min(0).optional(),
  maxServices: z.number().int().min(-1).optional(),
  maxEquipment: z.number().int().min(-1).optional(),
  maxBookings: z.number().int().min(-1).optional(),
  maxVenues: z.number().int().min(-1).optional(),
  maxVehicles: z.number().int().min(-1).optional(),
  features: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN" && session.role !== "PROVIDER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json({ plans });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        trialDays: data.trialDays,
        maxServices: data.maxServices,
        maxEquipment: data.maxEquipment,
        maxBookings: data.maxBookings,
        maxVenues: data.maxVenues,
        maxVehicles: data.maxVehicles,
        features: data.features,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.id } });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

    const updated = await prisma.subscriptionPlan.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.trialDays !== undefined && { trialDays: data.trialDays }),
        ...(data.maxServices !== undefined && { maxServices: data.maxServices }),
        ...(data.maxEquipment !== undefined && { maxEquipment: data.maxEquipment }),
        ...(data.maxBookings !== undefined && { maxBookings: data.maxBookings }),
        ...(data.maxVenues !== undefined && { maxVenues: data.maxVenues }),
        ...(data.maxVehicles !== undefined && { maxVehicles: data.maxVehicles }),
        ...(data.features !== undefined && { features: data.features }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
      },
    });

    return NextResponse.json({ plan: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Plan ID required" }, { status: 400 });

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  await prisma.subscriptionPlan.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
