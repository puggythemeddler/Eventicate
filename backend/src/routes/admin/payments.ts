import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { invalidateMpesaConfigCache } from "../../lib/mpesa";

const configSchema = z.object({
  mpesaEnv: z.enum(["sandbox", "production"]).default("sandbox"),
  mpesaConsumerKey: z.string().trim().optional(),
  mpesaConsumerSecret: z.string().trim().optional(),
  mpesaPasskey: z.string().trim().optional(),
  mpesaShortcode: z.string().trim().default("174379"),
  mpesaCallbackUrl: z.string().trim().url().optional().or(z.literal("")),
  mpesaCallbackSecret: z.string().trim().optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });

  const masked = (v: string | null | undefined) =>
    v ? (v.length > 8 ? `${v.slice(0, 4)}****${v.slice(-4)}` : "****") : "";

  return res.status(200).json({
    mpesaEnv: config?.mpesaEnv || "sandbox",
    mpesaConsumerKey: masked(config?.mpesaConsumerKey),
    mpesaConsumerSecret: masked(config?.mpesaConsumerSecret),
    mpesaPasskey: masked(config?.mpesaPasskey),
    mpesaShortcode: config?.mpesaShortcode || "174379",
    mpesaCallbackUrl: config?.mpesaCallbackUrl || "",
    mpesaCallbackSecret: masked(config?.mpesaCallbackSecret),
    configured: Boolean(config?.mpesaConsumerKey && config?.mpesaConsumerSecret && config?.mpesaPasskey),
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
    const pick = (key: string, envKey: string): string | undefined => {
      const value = body[key];
      if (typeof value === "string" && value.trim().length > 0 && !value.includes("****")) {
        return value.trim();
      }
      return current?.[key as keyof typeof current] as string | undefined;
    };

    const data = configSchema.parse({
      mpesaEnv: body.mpesaEnv || current?.mpesaEnv || "sandbox",
      mpesaConsumerKey: pick("mpesaConsumerKey", "MPESA_CONSUMER_KEY"),
      mpesaConsumerSecret: pick("mpesaConsumerSecret", "MPESA_CONSUMER_SECRET"),
      mpesaPasskey: pick("mpesaPasskey", "MPESA_PASSKEY"),
      mpesaShortcode: body.mpesaShortcode || current?.mpesaShortcode || "174379",
      mpesaCallbackUrl: body.mpesaCallbackUrl === "" ? "" : (body.mpesaCallbackUrl || current?.mpesaCallbackUrl || ""),
      mpesaCallbackSecret: pick("mpesaCallbackSecret", "MPESA_CALLBACK_SECRET"),
    });

    await prisma.systemConfig.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", appName: "Eventicate", ...data },
    });

    invalidateMpesaConfigCache();

    const updated = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    const masked = (v: string | null | undefined) =>
      v ? (v.length > 8 ? `${v.slice(0, 4)}****${v.slice(-4)}` : "****") : "";

    return res.status(200).json({
      mpesaEnv: updated?.mpesaEnv || "sandbox",
      mpesaConsumerKey: masked(updated?.mpesaConsumerKey),
      mpesaConsumerSecret: masked(updated?.mpesaConsumerSecret),
      mpesaPasskey: masked(updated?.mpesaPasskey),
      mpesaShortcode: updated?.mpesaShortcode || "174379",
      mpesaCallbackUrl: updated?.mpesaCallbackUrl || "",
      mpesaCallbackSecret: masked(updated?.mpesaCallbackSecret),
      configured: Boolean(updated?.mpesaConsumerKey && updated?.mpesaConsumerSecret && updated?.mpesaPasskey),
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