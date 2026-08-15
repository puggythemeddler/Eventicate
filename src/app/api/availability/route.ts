import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const slotSchema = z.object({
  date: z.string(),
  status: z.enum(["AVAILABLE", "UNAVAILABLE"]),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth()));
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);

  const slots = await prisma.availabilitySlot.findMany({
    where: {
      providerId: provider.id,
      date: { gte: start, lte: end },
    },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ slots });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  try {
    const body = await request.json();
    const data = slotSchema.parse(body);

    const dateOnly = new Date(data.date);
    dateOnly.setHours(0, 0, 0, 0);

    if (data.status === "AVAILABLE") {
      await prisma.availabilitySlot.deleteMany({
        where: { providerId: provider.id, date: dateOnly },
      });
    } else {
      await prisma.availabilitySlot.upsert({
        where: {
          providerId_date: { providerId: provider.id, date: dateOnly },
        },
        create: {
          providerId: provider.id,
          date: dateOnly,
          status: "UNAVAILABLE",
          notes: data.notes,
        },
        update: {
          status: "UNAVAILABLE",
          notes: data.notes,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update availability" }, { status: 500 });
  }
}
