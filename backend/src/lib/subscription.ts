import prisma from "./prisma";

export type ProviderAction = "addService" | "addEquipment" | "addVenue" | "addVehicle" | "createBooking";

export interface ProviderLimits {
  maxServices: number;
  maxEquipment: number;
  maxBookings: number;
  maxVenues: number;
  maxVehicles: number;
  servicesUsed: number;
  equipmentUsed: number;
  bookingsUsed: number;
  venuesUsed: number;
  vehiclesUsed: number;
  canAddService: boolean;
  canAddEquipment: boolean;
  canAddVenue: boolean;
  canAddVehicle: boolean;
  canCreateBooking: boolean;
  servicesRemaining: number;
  equipmentRemaining: number;
  bookingsRemaining: number;
  venuesRemaining: number;
  vehiclesRemaining: number;
}

export interface SubscriptionWithPlan {
  id: string;
  providerId: string;
  planId: string;
  status: string;
  trialStartAt: Date | null;
  trialEndAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  billingPeriod: string;
  plan: {
    id: string;
    name: string;
    price: number;
    annualPrice: number | null;
    maxServices: number;
    maxEquipment: number;
    maxBookings: number;
    maxVenues: number;
    maxVehicles: number;
    features: string[];
    trialDays: number;
  };
  daysRemaining?: number;
}

const TRIAL_DAYS = 30;

function getDefaultFreePlanLimits() {
  return {
    maxServices: 0,
    maxEquipment: 0,
    maxBookings: 0,
    maxVenues: 0,
    maxVehicles: 0,
    trialDays: 0,
  };
}

function resolveLimit(limit: number): number | null {
  return limit === -1 ? null : limit;
}

function isOverLimit(used: number, limit: number): boolean {
  if (limit === -1) return false;
  return used >= limit;
}

export async function getFreePlan(): Promise<{ id: string; name: string; price: number; annualPrice: number | null; maxServices: number; maxEquipment: number; maxBookings: number; maxVenues: number; maxVehicles: number; features: string[]; trialDays: number } | null> {
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Free", isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (!plan) return null;
  return { ...plan, features: JSON.parse(plan.features) };
}

export async function getOrCreateFreePlan(): Promise<{ id: string; name: string; price: number; annualPrice: number | null; maxServices: number; maxEquipment: number; maxBookings: number; maxVenues: number; maxVehicles: number; features: string[]; trialDays: number }> {
  const existing = await getFreePlan();
  if (existing) return existing;

  const plan = await prisma.subscriptionPlan.create({
    data: {
      name: "Free",
      description: "Free plan with limited features",
      price: 0,
      trialDays: 30,
      maxServices: 5,
      maxEquipment: 10,
      maxBookings: 25,
      maxVenues: 1,
      maxVehicles: 1,
      features: JSON.stringify(["Basic listing", "Standard support"]),
      sortOrder: 0,
      isActive: true,
    },
  });
  return { ...plan, features: JSON.parse(plan.features) };
}

export async function getProviderLimits(providerId: string): Promise<ProviderLimits> {
  const [subscription, counts] = await Promise.all([
    prisma.providerSubscription.findUnique({
      where: { providerId },
      include: { plan: true },
    }),
    prisma.providerProfile.findUnique({
      where: { id: providerId },
      include: {
        _count: { select: { services: true, equipment: true, bookings: true, venues: true, vehicles: true } },
      },
    }),
  ]);

  const activeStatuses: string[] = ["TRIAL", "ACTIVE"];
  const isActive = subscription ? activeStatuses.includes(subscription.status) : false;
  const expiredOrNoSub = !subscription || ["EXPIRED", "CANCELLED", "PAST_DUE"].includes(subscription.status);

  let maxServices: number;
  let maxEquipment: number;
  let maxBookings: number;
  let maxVenues: number;
  let maxVehicles: number;

  if (expiredOrNoSub) {
    const limits = getDefaultFreePlanLimits();
    maxServices = limits.maxServices;
    maxEquipment = limits.maxEquipment;
    maxBookings = limits.maxBookings;
    maxVenues = limits.maxVenues;
    maxVehicles = limits.maxVehicles;
  } else {
    maxServices = subscription!.plan.maxServices;
    maxEquipment = subscription!.plan.maxEquipment;
    maxBookings = subscription!.plan.maxBookings;
    maxVenues = subscription!.plan.maxVenues;
    maxVehicles = subscription!.plan.maxVehicles;
  }

  const used = counts?._count || { services: 0, equipment: 0, bookings: 0, venues: 0, vehicles: 0 };

  const servicesRemaining = resolveLimit(maxServices) !== null
    ? Math.max(0, maxServices - used.services)
    : Infinity;
  const equipmentRemaining = resolveLimit(maxEquipment) !== null
    ? Math.max(0, maxEquipment - used.equipment)
    : Infinity;
  const bookingsRemaining = resolveLimit(maxBookings) !== null
    ? Math.max(0, maxBookings - used.bookings)
    : Infinity;
  const venuesRemaining = resolveLimit(maxVenues) !== null
    ? Math.max(0, maxVenues - used.venues)
    : Infinity;
  const vehiclesRemaining = resolveLimit(maxVehicles) !== null
    ? Math.max(0, maxVehicles - used.vehicles)
    : Infinity;

  return {
    maxServices,
    maxEquipment,
    maxBookings,
    maxVenues,
    maxVehicles,
    servicesUsed: used.services,
    equipmentUsed: used.equipment,
    bookingsUsed: used.bookings,
    venuesUsed: used.venues,
    vehiclesUsed: used.vehicles,
    canAddService: isActive && !isOverLimit(used.services, maxServices),
    canAddEquipment: isActive && !isOverLimit(used.equipment, maxEquipment),
    canAddVenue: isActive && !isOverLimit(used.venues, maxVenues),
    canAddVehicle: isActive && !isOverLimit(used.vehicles, maxVehicles),
    canCreateBooking: isActive && !isOverLimit(used.bookings, maxBookings),
    servicesRemaining,
    equipmentRemaining,
    bookingsRemaining,
    venuesRemaining,
    vehiclesRemaining,
  };
}

export async function checkProviderCan(providerId: string, action: ProviderAction): Promise<{ allowed: boolean; reason?: string }> {
  const limits = await getProviderLimits(providerId);

  const checks: Record<ProviderAction, { allowed: boolean; label: string; remaining: number }> = {
    addService: { allowed: limits.canAddService, label: "services", remaining: limits.servicesRemaining },
    addEquipment: { allowed: limits.canAddEquipment, label: "equipment items", remaining: limits.equipmentRemaining },
    addVenue: { allowed: limits.canAddVenue, label: "venues", remaining: limits.venuesRemaining },
    addVehicle: { allowed: limits.canAddVehicle, label: "vehicles", remaining: limits.vehiclesRemaining },
    createBooking: { allowed: limits.canCreateBooking, label: "bookings", remaining: limits.bookingsRemaining },
  };

  const check = checks[action];
  if (!check.allowed) {
    if (limits.maxServices <= 0 && action === "addService") {
      return { allowed: false, reason: "Your subscription has expired or does not allow adding services. Please subscribe to continue." };
    }
    return { allowed: false, reason: check.remaining === 0
      ? `You have reached the maximum number of ${check.label} allowed by your plan. Please upgrade to add more.`
      : "Your subscription has expired or is inactive. Please renew to continue."
    };
  }

  return { allowed: true };
}

export async function getSubscriptionStatus(providerId: string): Promise<SubscriptionWithPlan | null> {
  const subscription = await prisma.providerSubscription.findUnique({
    where: { providerId },
    include: { plan: true },
  });

  if (!subscription) return null;

  const features = JSON.parse(subscription.plan.features) as string[];

  let daysRemaining: number | undefined;
  if (subscription.status === "TRIAL" && subscription.trialEndAt) {
    daysRemaining = Math.max(0, Math.ceil((subscription.trialEndAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  } else if (subscription.currentPeriodEnd) {
    daysRemaining = Math.max(0, Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  return {
    id: subscription.id,
    providerId: subscription.providerId,
    planId: subscription.planId,
    status: subscription.status,
    trialStartAt: subscription.trialStartAt,
    trialEndAt: subscription.trialEndAt,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelledAt: subscription.cancelledAt,
    createdAt: subscription.createdAt,
    billingPeriod: subscription.billingPeriod,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      price: subscription.plan.price,
      annualPrice: subscription.plan.annualPrice,
      maxServices: subscription.plan.maxServices,
      maxEquipment: subscription.plan.maxEquipment,
      maxBookings: subscription.plan.maxBookings,
      maxVenues: subscription.plan.maxVenues,
      maxVehicles: subscription.plan.maxVehicles,
      features,
      trialDays: subscription.plan.trialDays,
    },
    daysRemaining,
  };
}

export async function startTrial(providerId: string): Promise<SubscriptionWithPlan> {
  const freePlan = await getOrCreateFreePlan();

  const trialStart = new Date();
  const trialEnd = new Date(trialStart.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  let subscription = await prisma.providerSubscription.findUnique({
    where: { providerId },
    include: { plan: true },
  });

  if (subscription) {
    if (subscription.status === "ACTIVE") {
      const plan = subscription.plan;
      const features = JSON.parse(plan.features) as string[];
      return {
        id: subscription.id,
        providerId: subscription.providerId,
        planId: subscription.planId,
        status: subscription.status,
        trialStartAt: subscription.trialStartAt,
        trialEndAt: subscription.trialEndAt,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        createdAt: subscription.createdAt,
        billingPeriod: subscription.billingPeriod,
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          annualPrice: plan.annualPrice,
          maxServices: plan.maxServices,
          maxEquipment: plan.maxEquipment,
          maxBookings: plan.maxBookings,
          maxVenues: plan.maxVenues,
          maxVehicles: plan.maxVehicles,
          features,
          trialDays: plan.trialDays,
        },
      };
    }

    subscription = await prisma.providerSubscription.update({
      where: { providerId },
      data: {
        planId: freePlan.id,
        status: "TRIAL",
        trialStartAt: trialStart,
        trialEndAt: trialEnd,
        currentPeriodStart: trialStart,
        currentPeriodEnd: trialEnd,
        cancelledAt: null,
      },
      include: { plan: true },
    });
  } else {
    subscription = await prisma.providerSubscription.create({
      data: {
        providerId,
        planId: freePlan.id,
        status: "TRIAL",
        trialStartAt: trialStart,
        trialEndAt: trialEnd,
        currentPeriodStart: trialStart,
        currentPeriodEnd: trialEnd,
      },
      include: { plan: true },
    });
  }

  const features = JSON.parse(subscription.plan.features) as string[];
  return {
    id: subscription.id,
    providerId: subscription.providerId,
    planId: subscription.planId,
    status: subscription.status,
    trialStartAt: subscription.trialStartAt,
    trialEndAt: subscription.trialEndAt,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelledAt: subscription.cancelledAt,
    createdAt: subscription.createdAt,
    billingPeriod: subscription.billingPeriod,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      price: subscription.plan.price,
      annualPrice: subscription.plan.annualPrice,
      maxServices: subscription.plan.maxServices,
      maxEquipment: subscription.plan.maxEquipment,
      maxBookings: subscription.plan.maxBookings,
      maxVenues: subscription.plan.maxVenues,
      maxVehicles: subscription.plan.maxVehicles,
      features,
      trialDays: subscription.plan.trialDays,
    },
    daysRemaining: TRIAL_DAYS,
  };
}

export async function subscribeToPlan(
  providerId: string,
  planId: string,
  billingPeriod: "MONTHLY" | "ANNUAL" = "MONTHLY"
): Promise<SubscriptionWithPlan> {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan not found");
  if (!plan.isActive) throw new Error("Plan is not active");

  const now = new Date();
  const days = billingPeriod === "ANNUAL" ? 365 : 30;
  const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  let subscription = await prisma.providerSubscription.findUnique({
    where: { providerId },
    include: { plan: true },
  });

  if (subscription) {
    subscription = await prisma.providerSubscription.update({
      where: { providerId },
      data: {
        planId: plan.id,
        status: "ACTIVE",
        billingPeriod,
        trialStartAt: null,
        trialEndAt: null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
      },
      include: { plan: true },
    });
  } else {
    subscription = await prisma.providerSubscription.create({
      data: {
        providerId,
        planId: plan.id,
        status: "ACTIVE",
        billingPeriod,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });
  }

  const features = JSON.parse(subscription.plan.features) as string[];
  return {
    id: subscription.id,
    providerId: subscription.providerId,
    planId: subscription.planId,
    status: subscription.status,
    trialStartAt: subscription.trialStartAt,
    trialEndAt: subscription.trialEndAt,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelledAt: subscription.cancelledAt,
    createdAt: subscription.createdAt,
    billingPeriod: subscription.billingPeriod,
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      price: subscription.plan.price,
      annualPrice: subscription.plan.annualPrice,
      maxServices: subscription.plan.maxServices,
      maxEquipment: subscription.plan.maxEquipment,
      maxBookings: subscription.plan.maxBookings,
      maxVenues: subscription.plan.maxVenues,
      maxVehicles: subscription.plan.maxVehicles,
      features,
      trialDays: subscription.plan.trialDays,
    },
    daysRemaining: days,
  };
}

export async function getAvailablePlans() {
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return plans.map((p) => ({ ...p, features: JSON.parse(p.features) }));
}
