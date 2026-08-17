import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { invalidateWhatsAppConfigCache } from "../../lib/whatsapp";

const configSchema = z.object({
  whatsappAccessToken: z.string().trim().optional(),
  whatsappPhoneId: z.string().trim().optional(),
  whatsappVerifyToken: z.string().trim().optional(),
  whatsappBusinessPhone: z.string().trim().optional(),
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
    whatsappAccessToken: masked(config?.whatsappAccessToken),
    whatsappPhoneId: config?.whatsappPhoneId || "",
    whatsappVerifyToken: masked(config?.whatsappVerifyToken),
    whatsappBusinessPhone: config?.whatsappBusinessPhone || "",
    configured: Boolean(config?.whatsappAccessToken && config?.whatsappPhoneId),
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
      whatsappAccessToken: pick("whatsappAccessToken"),
      whatsappPhoneId: body.whatsappPhoneId || current?.whatsappPhoneId || "",
      whatsappVerifyToken: pick("whatsappVerifyToken"),
      whatsappBusinessPhone: body.whatsappBusinessPhone || current?.whatsappBusinessPhone || "",
    });

    await prisma.systemConfig.upsert({
      where: { id: "default" },
      update: data,
      create: { id: "default", appName: "Eventicate", ...data },
    });

    invalidateWhatsAppConfigCache();

    const updated = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    const masked = (v: string | null | undefined) =>
      v ? (v.length > 8 ? `${v.slice(0, 4)}****${v.slice(-4)}` : "****") : "";

    return res.status(200).json({
      whatsappAccessToken: masked(updated?.whatsappAccessToken),
      whatsappPhoneId: updated?.whatsappPhoneId || "",
      whatsappVerifyToken: masked(updated?.whatsappVerifyToken),
      whatsappBusinessPhone: updated?.whatsappBusinessPhone || "",
      configured: Boolean(updated?.whatsappAccessToken && updated?.whatsappPhoneId),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Failed to update WhatsApp config:", error);
    return res.status(500).json({ error: "Failed to update WhatsApp config" });
  }
});

export default router;