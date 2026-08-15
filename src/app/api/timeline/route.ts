import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { parseJsonArray, toJsonArray } from "@/lib/utils";

const entrySchema = z.object({
  time: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  providerId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const event = await prisma.event.findFirst({
    where: { id: eventId },
    select: { id: true, customerId: true, timelineData: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const isOwner = event.customerId === (
    await prisma.customerProfile.findUnique({ where: { userId: session.id } })
  )?.id;

  const isProvider = session.role === "PROVIDER";
  if (!isOwner && !isProvider) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const timeline = parseJsonArray<Record<string, unknown>>(event.timelineData);
  return NextResponse.json({ timeline });
}

const saveSchema = z.object({
  eventId: z.string(),
  timeline: z.array(entrySchema),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = saveSchema.parse(body);

    const event = await prisma.event.findFirst({
      where: { id: data.eventId },
      select: { id: true, customerId: true },
    });
    if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (event.customerId !== customer?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const enriched = data.timeline.map((entry, index) => ({
      ...entry,
      id: `entry_${Date.now()}_${index}`,
      sortOrder: index,
    }));

    await prisma.event.update({
      where: { id: data.eventId },
      data: { timelineData: toJsonArray(enriched) },
    });

    return NextResponse.json({ timeline: enriched });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Timeline save error:", error);
    return NextResponse.json({ error: "Failed to save timeline" }, { status: 500 });
  }
}
