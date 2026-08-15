import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const eventSchema = z.object({
  title: z.string().min(1),
  eventType: z.enum([
    "WEDDING", "FUNERAL", "BIRTHDAY", "CORPORATE",
    "CONCERT", "CHURCH", "GRADUATION", "OTHER",
  ]),
  eventDate: z.string(),
  eventEndDate: z.string().optional(),
  location: z.string().min(1),
  guestCount: z.number().int().positive(),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  description: z.string().optional(),
  requiredServices: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });

  const events = await prisma.event.findMany({
    where: { customerId: customer.id },
    include: {
      bookings: {
        include: {
          provider: { select: { businessName: true, category: true } },
        },
      },
    },
    orderBy: { eventDate: "asc" },
  });

  return NextResponse.json({ events });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = eventSchema.parse(body);

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!customer) return NextResponse.json({ error: "Customer profile not found" }, { status: 404 });

    const event = await prisma.event.create({
      data: {
        customerId: customer.id,
        title: data.title,
        eventType: data.eventType,
        eventDate: new Date(data.eventDate),
        eventEndDate: data.eventEndDate ? new Date(data.eventEndDate) : null,
        location: data.location,
        guestCount: data.guestCount,
        budgetMin: data.budgetMin,
        budgetMax: data.budgetMax,
        description: data.description,
        requiredServices: JSON.stringify(data.requiredServices || []),
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
