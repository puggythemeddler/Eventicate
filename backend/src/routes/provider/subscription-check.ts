import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { getProviderLimits, getSubscriptionStatus } from "../../lib/subscription";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const [limits, subscription] = await Promise.all([
    getProviderLimits(provider.id),
    getSubscriptionStatus(provider.id),
  ]);

  return res.status(200).json({
    limits,
    subscription,
    trialDaysRemaining: subscription?.daysRemaining ?? 0,
    isOnTrial: subscription?.status === "TRIAL",
    isSubscribed: subscription?.status === "ACTIVE",
    hasExpired: subscription && ["EXPIRED", "CANCELLED", "PAST_DUE"].includes(subscription.status),
  });
});

export default router;
