import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { ServiceCategory } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SERVICE_CATEGORIES } from "@/lib/constants";

const categoryValues = SERVICE_CATEGORIES.map((c) => c.value) as [ServiceCategory, ...ServiceCategory[]];

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(categoryValues),
  basePrice: z.number().min(0),
  discountPercent: z.number().min(0).max(100).optional().default(0),
  images: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(categoryValues).optional(),
  basePrice: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const services = await prisma.service.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ services });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const { checkProviderCan } = await import("@/lib/subscription");
  const canResult = await checkProviderCan(provider.id, "addService");
  if (!canResult.allowed) {
    return NextResponse.json({ error: canResult.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const service = await prisma.service.create({
      data: {
        providerId: provider.id,
        name: data.name,
        description: data.description,
        category: data.category,
        basePrice: data.basePrice,
        discountPercent: data.discountPercent,
        images: JSON.stringify(data.images || []),
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
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

    const service = await prisma.service.findFirst({
      where: { id: data.id, providerId: provider.id },
    });
    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

    const updated = await prisma.service.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.discountPercent !== undefined && { discountPercent: data.discountPercent }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    return NextResponse.json({ service: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
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
  if (!id) return NextResponse.json({ error: "Service ID required" }, { status: 400 });

  const service = await prisma.service.findFirst({
    where: { id, providerId: provider.id },
  });
  if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 });

  await prisma.service.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
