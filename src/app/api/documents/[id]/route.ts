import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/booking-engine";

const updateSchema = z.object({
  status: z.enum([
    "DRAFT", "SENT", "ACCEPTED", "REJECTED", "PAID", "OVERDUE", "CANCELLED",
  ]).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  depositPaid: z.boolean().optional(),
  paidAt: z.string().datetime().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          event: { select: { title: true, eventDate: true } },
          provider: { select: { businessName: true } },
          customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        },
      },
    },
  });

  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "PROVIDER" && document.senderId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (session.role === "CUSTOMER" && document.recipientId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ document });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (session.role === "PROVIDER" && existing.senderId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (session.role === "CUSTOMER" && existing.recipientId !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.status === "PAID") {
      updateData.paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
    }

    const updated = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    if (data.status === "SENT" && existing.recipientId) {
      await createNotification(
        existing.recipientId,
        "BOOKING",
        `${existing.type === "QUOTE" ? "Quote" : "Invoice"} Sent`,
        `A ${existing.type.toLowerCase()} has been sent to you`,
        session.role === "PROVIDER"
          ? `/dashboard/documents/${id}`
          : `/provider/documents/${id}`
      );
    }

    return NextResponse.json({ document: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (existing.status !== "DRAFT") {
    return NextResponse.json({ error: "Only draft documents can be deleted" }, { status: 400 });
  }

  if (session.role === "PROVIDER" && existing.senderId !== session.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
