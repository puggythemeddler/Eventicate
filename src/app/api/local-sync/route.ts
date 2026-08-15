import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const syncSchema = z.object({
  action: z.enum(["sync_bookings", "sync_inventory", "push_booking"]),
  entityId: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
    include: { localSyncConfig: true },
  });

  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const logs = await prisma.localSyncLog.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    config: provider.localSyncConfig,
    logs,
    enabled: process.env.LOCAL_SYNC_ENABLED === "true",
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data = syncSchema.parse(body);

    const provider = await prisma.providerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

    const log = await prisma.localSyncLog.create({
      data: {
        userId: session.id,
        action: data.action,
        entityType: data.action.includes("booking") ? "booking" : "inventory",
        entityId: data.entityId || "bulk",
        status: "SYNCED",
        details: JSON.stringify(data.data || {}),
      },
    });

    if (data.action === "sync_bookings") {
      const bookings = await prisma.booking.findMany({
        where: { providerId: provider.id },
        include: { event: true, customer: { include: { user: true } } },
      });
      return NextResponse.json({ log, syncedBookings: bookings.length, bookings });
    }

    if (data.action === "sync_inventory") {
      const [equipment, vehicles, venues] = await Promise.all([
        prisma.equipment.findMany({ where: { providerId: provider.id } }),
        prisma.vehicle.findMany({ where: { providerId: provider.id } }),
        prisma.venue.findMany({ where: { providerId: provider.id } }),
      ]);
      return NextResponse.json({
        log,
        inventory: { equipment: equipment.length, vehicles: vehicles.length, venues: venues.length },
        data: { equipment, vehicles, venues },
      });
    }

    return NextResponse.json({ log, message: "Sync completed" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const config = await prisma.localSyncConfig.upsert({
    where: { providerId: provider.id },
    create: {
      providerId: provider.id,
      isEnabled: body.isEnabled ?? false,
      localDbUrl: body.localDbUrl,
      syncInterval: body.syncInterval ?? 300,
      apiKey: body.apiKey,
    },
    update: {
      isEnabled: body.isEnabled,
      localDbUrl: body.localDbUrl,
      syncInterval: body.syncInterval,
      apiKey: body.apiKey,
      lastSyncAt: new Date(),
    },
  });

  return NextResponse.json({ config });
}
