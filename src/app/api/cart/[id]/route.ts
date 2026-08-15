import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = z.object({ quantity: z.number().int().positive() }).parse(body);

    const customer = await prisma.customerProfile.findUnique({ where: { userId: session.id } });
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

    const item = await prisma.cartItem.findFirst({
      where: { id, customerId: customer.id },
    });
    if (!item) return NextResponse.json({ error: "Cart item not found" }, { status: 404 });

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity: data.quantity },
    });

    return NextResponse.json({ item: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.id } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const item = await prisma.cartItem.findFirst({
    where: { id, customerId: customer.id },
  });
  if (!item) return NextResponse.json({ error: "Cart item not found" }, { status: 404 });

  await prisma.cartItem.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
