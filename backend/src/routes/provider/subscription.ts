import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { getSubscriptionStatus, startTrial, subscribeToPlan } from "../../lib/subscription";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  const subscription = await getSubscriptionStatus(provider.id);
  return res.status(200).json({ subscription });
});

const bodySchema = z.object({
  planId: z.string().optional(),
  billingPeriod: z.enum(["MONTHLY", "ANNUAL"]).optional().default("MONTHLY"),
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const body = req.body ?? {};
    const data = bodySchema.parse(body);

    if (data.planId) {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.planId } });
      if (!plan) return res.status(404).json({ error: "Plan not found" });
      if (!plan.isActive) return res.status(400).json({ error: "Plan is not active" });
      if (plan.price.toNumber() > 0) {
        // Paid plans are only activated after confirmed payment (mpesa-callback / payments/status).
        // Idempotently return an already-active matching subscription (frontend refreshes after payment).
        const existing = await prisma.providerSubscription.findUnique({
          where: { providerId: provider.id },
          include: { plan: true },
        });
        if (existing && existing.status === "ACTIVE" && existing.planId === data.planId) {
          return res.status(200).json({ subscription: await getSubscriptionStatus(provider.id) });
        }
        return res.status(402).json({
          error: "Payment required. Paid plans are activated after payment via /api/payments/initiate.",
        });
      }
      const subscription = await subscribeToPlan(provider.id, data.planId, data.billingPeriod);
      return res.status(200).json({ subscription });
    }

    const subscription = await startTrial(provider.id);
    return res.status(200).json({ subscription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to process subscription" });
  }
});

export default router;
