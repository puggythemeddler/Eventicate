import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";

const syncSchema = z.object({
  action: z.enum(["sync_bookings", "sync_inventory", "push_booking"]),
  entityId: z.string().max(100).optional(),
  data: z.record(z.unknown()).optional(),
});

const configSchema = z.object({
  isEnabled: z.boolean().optional(),
  localDbUrl: z.string().max(500).optional(),
  syncInterval: z.number().int().min(60).max(86400).optional(),
  apiKey: z.string().max(200).optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "PROVIDER") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
    include: { localSyncConfig: true },
  });

  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const logs = await prisma.localSyncLog.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const config = provider.localSyncConfig
    ? (({ apiKey: _apiKey, ...rest }) => rest)(provider.localSyncConfig)
    : null;

  return res.status(200).json({
    config,
    logs,
    enabled: process.env.LOCAL_SYNC_ENABLED === "true",
  });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "PROVIDER") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const body = req.body;
    const data = syncSchema.parse(body);

    const provider = await prisma.providerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!provider) return res.status(404).json({ error: "Provider not found" });

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
      return res.status(200).json({ log, syncedBookings: bookings.length, bookings });
    }

    if (data.action === "sync_inventory") {
      const [equipment, vehicles, venues] = await Promise.all([
        prisma.equipment.findMany({ where: { providerId: provider.id } }),
        prisma.vehicle.findMany({ where: { providerId: provider.id } }),
        prisma.venue.findMany({ where: { providerId: provider.id } }),
      ]);
      return res.status(200).json({
        log,
        inventory: { equipment: equipment.length, vehicles: vehicles.length, venues: venues.length },
        data: { equipment, vehicles, venues },
      });
    }

    return res.status(200).json({ log, message: "Sync completed" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Sync failed" });
  }
});

router.put("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "PROVIDER") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const data = configSchema.parse(req.body);
    const provider = await prisma.providerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!provider) return res.status(404).json({ error: "Provider not found" });

    const config = await prisma.localSyncConfig.upsert({
      where: { providerId: provider.id },
      create: {
        providerId: provider.id,
        isEnabled: data.isEnabled ?? false,
        localDbUrl: data.localDbUrl,
        syncInterval: data.syncInterval ?? 300,
        apiKey: data.apiKey,
      },
      update: {
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.localDbUrl !== undefined && { localDbUrl: data.localDbUrl }),
        ...(data.syncInterval !== undefined && { syncInterval: data.syncInterval }),
        ...(data.apiKey !== undefined && { apiKey: data.apiKey }),
        lastSyncAt: new Date(),
      },
    });

    // Never echo the stored API key back to the client.
    const { apiKey: _apiKey, ...safeConfig } = config;
    return res.status(200).json({ config: safeConfig });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to update sync config" });
  }
});

export default router;
