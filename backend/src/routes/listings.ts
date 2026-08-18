import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { checkProviderCan } from "../lib/subscription";

async function getProviderOr401(req: { userId: string }) {
  const provider = await prisma.providerProfile.findUnique({
    where: { userId: req.userId },
  });
  return provider;
}

// ─── Venues ───────────────────────────────────────────────────────────────────

const venueSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  location: z.string().min(1),
  capacity: z.number().int().positive(),
  facilities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  basePrice: z.number().min(0),
});

const venueUpdateSchema = venueSchema.partial().extend({ id: z.string(), isActive: z.boolean().optional() });

const venuesRouter = Router();

venuesRouter.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.id } });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const venues = await prisma.venue.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json({ venues });
});

venuesRouter.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const canResult = await checkProviderCan(provider.id, "addVenue");
  if (!canResult.allowed) return res.status(403).json({ error: canResult.reason });

  try {
    const data = venueSchema.parse(req.body);
    const venue = await prisma.venue.create({
      data: {
        providerId: provider.id,
        name: data.name,
        description: data.description,
        location: data.location,
        capacity: data.capacity,
        facilities: JSON.stringify(data.facilities || []),
        images: JSON.stringify(data.images || []),
        videos: JSON.stringify(data.videos || []),
        packages: JSON.stringify([]),
        eventPricing: JSON.stringify({}),
        basePrice: data.basePrice,
      },
    });
    return res.status(201).json({ venue });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    return res.status(500).json({ error: "Failed to create venue" });
  }
});

venuesRouter.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const data = venueUpdateSchema.parse(req.body);
    const existing = await prisma.venue.findFirst({ where: { id: data.id, providerId: provider.id } });
    if (!existing) return res.status(404).json({ error: "Venue not found" });

    const updated = await prisma.venue.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.facilities !== undefined && { facilities: JSON.stringify(data.facilities) }),
        ...(data.images !== undefined && { images: JSON.stringify(data.images) }),
        ...(data.videos !== undefined && { videos: JSON.stringify(data.videos) }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return res.status(200).json({ venue: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    return res.status(500).json({ error: "Failed to update venue" });
  }
});

venuesRouter.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const id = req.query.id as string | undefined;
  if (!id) return res.status(400).json({ error: "Venue ID required" });

  const venue = await prisma.venue.findFirst({ where: { id, providerId: provider.id } });
  if (!venue) return res.status(404).json({ error: "Venue not found" });

  await prisma.venue.delete({ where: { id } });
  return res.status(200).json({ success: true });
});

// ─── Vehicles ─────────────────────────────────────────────────────────────────

const vehicleSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  capacity: z.number().int().positive(),
  description: z.string().optional(),
  images: z.array(z.string()).optional(),
  driverName: z.string().optional(),
  driverPhone: z.string().optional(),
  pricePerKm: z.number().min(0).default(0),
  basePrice: z.number().min(0),
});

const vehicleUpdateSchema = vehicleSchema.partial().extend({ id: z.string(), isActive: z.boolean().optional() });

const vehiclesRouter = Router();

vehiclesRouter.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.id } });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const vehicles = await prisma.vehicle.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json({ vehicles });
});

vehiclesRouter.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const canResult = await checkProviderCan(provider.id, "addVehicle");
  if (!canResult.allowed) return res.status(403).json({ error: canResult.reason });

  try {
    const data = vehicleSchema.parse(req.body);
    const vehicle = await prisma.vehicle.create({
      data: {
        providerId: provider.id,
        name: data.name,
        type: data.type,
        capacity: data.capacity,
        description: data.description,
        images: JSON.stringify(data.images || []),
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        pricePerKm: data.pricePerKm,
        basePrice: data.basePrice,
      },
    });
    return res.status(201).json({ vehicle });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    return res.status(500).json({ error: "Failed to create vehicle" });
  }
});

vehiclesRouter.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const data = vehicleUpdateSchema.parse(req.body);
    const existing = await prisma.vehicle.findFirst({ where: { id: data.id, providerId: provider.id } });
    if (!existing) return res.status(404).json({ error: "Vehicle not found" });

    const updated = await prisma.vehicle.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.images !== undefined && { images: JSON.stringify(data.images) }),
        ...(data.driverName !== undefined && { driverName: data.driverName }),
        ...(data.driverPhone !== undefined && { driverPhone: data.driverPhone }),
        ...(data.pricePerKm !== undefined && { pricePerKm: data.pricePerKm }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return res.status(200).json({ vehicle: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    return res.status(500).json({ error: "Failed to update vehicle" });
  }
});

vehiclesRouter.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const id = req.query.id as string | undefined;
  if (!id) return res.status(400).json({ error: "Vehicle ID required" });

  const vehicle = await prisma.vehicle.findFirst({ where: { id, providerId: provider.id } });
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

  await prisma.vehicle.delete({ where: { id } });
  return res.status(200).json({ success: true });
});

// ─── Menu packages ────────────────────────────────────────────────────────────

const menuSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  eventType: z.string().optional(),
  servingStyle: z.string().min(1),
  guestCount: z.number().int().positive(),
  includesDrinks: z.boolean().default(false),
  includesDessert: z.boolean().default(false),
  menuItems: z.array(z.string()).optional(),
  dietaryOptions: z.array(z.string()).optional(),
  basePrice: z.number().min(0),
  pricePerGuest: z.number().min(0).default(0),
  images: z.array(z.string()).optional(),
});

const menuUpdateSchema = menuSchema.partial().extend({ id: z.string(), isActive: z.boolean().optional() });

const menuPackagesRouter = Router();

menuPackagesRouter.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.id } });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const menuPackages = await prisma.menuPackage.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json({ menuPackages });
});

menuPackagesRouter.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const data = menuSchema.parse(req.body);
    const menuPackage = await prisma.menuPackage.create({
      data: {
        providerId: provider.id,
        name: data.name,
        description: data.description,
        eventType: (data.eventType || null) as never,
        servingStyle: data.servingStyle,
        guestCount: data.guestCount,
        includesDrinks: data.includesDrinks,
        includesDessert: data.includesDessert,
        menuItems: JSON.stringify(data.menuItems || []),
        dietaryOptions: JSON.stringify(data.dietaryOptions || []),
        basePrice: data.basePrice,
        pricePerGuest: data.pricePerGuest,
        images: JSON.stringify(data.images || []),
      },
    });
    return res.status(201).json({ menuPackage });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    return res.status(500).json({ error: "Failed to create menu package" });
  }
});

menuPackagesRouter.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const data = menuUpdateSchema.parse(req.body);
    const existing = await prisma.menuPackage.findFirst({ where: { id: data.id, providerId: provider.id } });
    if (!existing) return res.status(404).json({ error: "Menu package not found" });

    const updated = await prisma.menuPackage.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.eventType !== undefined && { eventType: (data.eventType || null) as never }),
        ...(data.servingStyle !== undefined && { servingStyle: data.servingStyle }),
        ...(data.guestCount !== undefined && { guestCount: data.guestCount }),
        ...(data.includesDrinks !== undefined && { includesDrinks: data.includesDrinks }),
        ...(data.includesDessert !== undefined && { includesDessert: data.includesDessert }),
        ...(data.menuItems !== undefined && { menuItems: JSON.stringify(data.menuItems) }),
        ...(data.dietaryOptions !== undefined && { dietaryOptions: JSON.stringify(data.dietaryOptions) }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.pricePerGuest !== undefined && { pricePerGuest: data.pricePerGuest }),
        ...(data.images !== undefined && { images: JSON.stringify(data.images) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return res.status(200).json({ menuPackage: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    return res.status(500).json({ error: "Failed to update menu package" });
  }
});

menuPackagesRouter.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const id = req.query.id as string | undefined;
  if (!id) return res.status(400).json({ error: "Menu package ID required" });

  const existing = await prisma.menuPackage.findFirst({ where: { id, providerId: provider.id } });
  if (!existing) return res.status(404).json({ error: "Menu package not found" });

  await prisma.menuPackage.delete({ where: { id } });
  return res.status(200).json({ success: true });
});

// ─── Photo packages ───────────────────────────────────────────────────────────

const photoSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  coverageHours: z.number().int().positive().optional(),
  includesEditing: z.boolean().default(false),
  includesAlbum: z.boolean().default(false),
  includesDrone: z.boolean().default(false),
  basePrice: z.number().min(0),
  images: z.array(z.string()).optional(),
});

const photoUpdateSchema = photoSchema.partial().extend({ id: z.string(), isActive: z.boolean().optional() });

const photoPackagesRouter = Router();

photoPackagesRouter.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({ where: { userId: session.id } });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const photoPackages = await prisma.photoPackage.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json({ photoPackages });
});

photoPackagesRouter.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const data = photoSchema.parse(req.body);
    const photoPackage = await prisma.photoPackage.create({
      data: {
        providerId: provider.id,
        name: data.name,
        type: data.type,
        description: data.description,
        coverageHours: data.coverageHours,
        includesEditing: data.includesEditing,
        includesAlbum: data.includesAlbum,
        includesDrone: data.includesDrone,
        basePrice: data.basePrice,
        images: JSON.stringify(data.images || []),
      },
    });
    return res.status(201).json({ photoPackage });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    return res.status(500).json({ error: "Failed to create photo package" });
  }
});

photoPackagesRouter.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const data = photoUpdateSchema.parse(req.body);
    const existing = await prisma.photoPackage.findFirst({ where: { id: data.id, providerId: provider.id } });
    if (!existing) return res.status(404).json({ error: "Photo package not found" });

    const updated = await prisma.photoPackage.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.coverageHours !== undefined && { coverageHours: data.coverageHours }),
        ...(data.includesEditing !== undefined && { includesEditing: data.includesEditing }),
        ...(data.includesAlbum !== undefined && { includesAlbum: data.includesAlbum }),
        ...(data.includesDrone !== undefined && { includesDrone: data.includesDrone }),
        ...(data.basePrice !== undefined && { basePrice: data.basePrice }),
        ...(data.images !== undefined && { images: JSON.stringify(data.images) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return res.status(200).json({ photoPackage: updated });
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    return res.status(500).json({ error: "Failed to update photo package" });
  }
});

photoPackagesRouter.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await getProviderOr401({ userId: session.id });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const id = req.query.id as string | undefined;
  if (!id) return res.status(400).json({ error: "Photo package ID required" });

  const existing = await prisma.photoPackage.findFirst({ where: { id, providerId: provider.id } });
  if (!existing) return res.status(404).json({ error: "Photo package not found" });

  await prisma.photoPackage.delete({ where: { id } });
  return res.status(200).json({ success: true });
});

export { venuesRouter, vehiclesRouter, menuPackagesRouter, photoPackagesRouter };