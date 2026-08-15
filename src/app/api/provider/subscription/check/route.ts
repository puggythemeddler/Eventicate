import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getProviderLimits, getSubscriptionStatus } from "@/lib/subscription";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const [limits, subscription] = await Promise.all([
    getProviderLimits(provider.id),
    getSubscriptionStatus(provider.id),
  ]);

  return NextResponse.json({
    limits,
    subscription,
    trialDaysRemaining: subscription?.daysRemaining ?? 0,
    isOnTrial: subscription?.status === "TRIAL",
    isSubscribed: subscription?.status === "ACTIVE",
    hasExpired: subscription && ["EXPIRED", "CANCELLED", "PAST_DUE"].includes(subscription.status),
  });
}
