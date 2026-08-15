import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });

  const event = await prisma.event.findFirst({
    where: { id, customerId: customer.id },
    include: {
      bookings: {
        include: {
          provider: { select: { businessName: true, category: true } },
          service: true,
        },
      },
    },
  });

  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  return NextResponse.json({ event });
}
