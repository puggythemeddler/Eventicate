import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const addItemSchema = z.object({
  serviceId: z.string().optional(),
  equipmentId: z.string().optional(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const items = await prisma.cartItem.findMany({
    where: { customerId: customer.id },
    include: {
      service: {
        include: { provider: true },
      },
      equipment: {
        include: { provider: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped: Record<string, { provider: { id: string; businessName: string }; items: typeof items }> = {};
  for (const item of items) {
    const provider = item.service?.provider || item.equipment?.provider;
    if (!provider) continue;
    if (!grouped[provider.id]) {
      grouped[provider.id] = { provider: { id: provider.id, businessName: provider.businessName }, items: [] };
    }
    grouped[provider.id].items.push(item);
  }

  return NextResponse.json({ items, grouped: Object.values(grouped) });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = addItemSchema.parse(body);

    if (!data.serviceId && !data.equipmentId) {
      return NextResponse.json({ error: "serviceId or equipmentId required" }, { status: 400 });
    }

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    if (data.serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: data.serviceId },
        include: { provider: true },
      });
      if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    } else if (data.equipmentId) {
      const equipment = await prisma.equipment.findUnique({
        where: { id: data.equipmentId },
        include: { provider: true },
      });
      if (!equipment) return NextResponse.json({ error: "Equipment not found" }, { status: 404 });
    }

    const item = await prisma.cartItem.create({
      data: {
        customerId: customer.id,
        serviceId: data.serviceId || null,
        equipmentId: data.equipmentId || null,
        quantity: data.quantity,
        notes: data.notes,
      },
      include: {
        service: { include: { provider: true } },
        equipment: { include: { provider: true } },
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  await prisma.cartItem.deleteMany({
    where: { customerId: customer.id },
  });

  return NextResponse.json({ success: true });
}
