import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { getMpesaReadiness, invalidateMpesaConfigCache } from "../../lib/mpesa";

const configSchema = z.object({
  mpesaEnv: z.enum(["sandbox", "production"]).default("sandbox"),
  mpesaConsumerKey: z.string().trim().optional(),
  mpesaConsumerSecret: z.string().trim().optional(),
  mpesaPasskey: z.string().trim().optional(),
  mpesaShortcode: z.string().trim().default("174379"),
  mpesaCallbackUrl: z.string().trim().url().optional().or(z.literal("")),
  mpesaCallbackSecret: z.string().trim().optional(),
  ticketCommissionRate: z.number().min(0).max(0.2).default(0.06),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  const readiness = await getMpesaReadiness();

  const masked = (v: string | null | undefined) =>
    v ? (v.length > 8 ? `${v.slice(0, 4)}****${v.slice(-4)}` : "****") : "";

  return res.status(200).json({
    mpesaEnv: config?.mpesaEnv || process.env.MPESA_ENV || "sandbox",
    mpesaConsumerKey: masked(config?.mpesaConsumerKey || process.env.MPESA_CONSUMER_KEY),
    mpesaConsumerSecret: masked(config?.mpesaConsumerSecret || process.env.MPESA_CONSUMER_SECRET),
    mpesaPasskey: masked(config?.mpesaPasskey || process.env.MPESA_PASSKEY),
    mpesaShortcode: config?.mpesaShortcode || process.env.MPESA_SHORTCODE || "174379",
    mpesaCallbackUrl: config?.mpesaCallbackUrl || readiness.callbackUrl,
    mpesaCallbackSecret: masked(config?.mpesaCallbackSecret || process.env.MPESA_CALLBACK_SECRET),
    configured: readiness.configured,
    missingFields: readiness.missingFields,
    ticketCommissionRate: config?.ticketCommissionRate ?? 0.06,
  });
});

router.put("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const body = req.body;
    const current = await prisma.systemConfig.findUnique({ where: { id: "default" } });

    // Only overwrite a field when the client sends a non-empty value, so the
    // masked values returned by GET can't accidentally wipe stored secrets.
    const pick = (key: string): string | undefined => {
      const value = body[key];
      if (typeof value === "string" && value.trim().length > 0 && !value.includes("****")) {
        return value.trim();
      }
      const existing = current?.[key as keyof typeof current];
      return typeof existing === "string" && existing.length > 0 ? existing : undefined;
    };

    const data = configSchema.parse({
      mpesaEnv: body.mpesaEnv || current?.mpesaEnv || "sandbox",
      mpesaConsumerKey: pick("mpesaConsumerKey"),
      mpesaConsumerSecret: pick("mpesaConsumerSecret"),
      mpesaPasskey: pick("mpesaPasskey"),
      mpesaShortcode: body.mpesaShortcode || current?.mpesaShortcode || "174379",
      mpesaCallbackUrl: body.mpesaCallbackUrl === "" ? "" : (body.mpesaCallbackUrl || current?.mpesaCallbackUrl || ""),
      mpesaCallbackSecret: pick("mpesaCallbackSecret"),
      ticketCommissionRate: body.ticketCommissionRate ?? current?.ticketCommissionRate ?? 0.06,
    });

    await prisma.systemConfig.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", appName: "Eventicate", ...data },
    });

    invalidateMpesaConfigCache();

    const updated = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    const readiness = await getMpesaReadiness();
    const masked = (v: string | null | undefined) =>
      v ? (v.length > 8 ? `${v.slice(0, 4)}****${v.slice(-4)}` : "****") : "";

    return res.status(200).json({
      mpesaEnv: updated?.mpesaEnv || process.env.MPESA_ENV || "sandbox",
      mpesaConsumerKey: masked(updated?.mpesaConsumerKey || process.env.MPESA_CONSUMER_KEY),
      mpesaConsumerSecret: masked(updated?.mpesaConsumerSecret || process.env.MPESA_CONSUMER_SECRET),
      mpesaPasskey: masked(updated?.mpesaPasskey || process.env.MPESA_PASSKEY),
      mpesaShortcode: updated?.mpesaShortcode || process.env.MPESA_SHORTCODE || "174379",
      mpesaCallbackUrl: updated?.mpesaCallbackUrl || readiness.callbackUrl,
      mpesaCallbackSecret: masked(updated?.mpesaCallbackSecret || process.env.MPESA_CALLBACK_SECRET),
      configured: readiness.configured,
      missingFields: readiness.missingFields,
      ticketCommissionRate: updated?.ticketCommissionRate ?? 0.06,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Failed to update payment config:", error);
    return res.status(500).json({ error: "Failed to update payment config" });
  }
});

export default router;
