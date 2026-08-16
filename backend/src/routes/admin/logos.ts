import { Router } from "express";
import multer from "multer";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { uploadBuffer, destroyAsset, cloudinaryEnabled } from "../../lib/cloudinary";

const LOGO_KEYS = ["logoLight", "logoDark", "logoInvoice"] as const;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      return cb(new Error("Invalid file type"));
    }
    cb(null, true);
  },
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  return res.status(200).json({
    logoLight: config?.logoLight || null,
    logoDark: config?.logoDark || null,
    logoInvoice: config?.logoInvoice || null,
    appName: config?.appName || "Eventicate",
  });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  if (!cloudinaryEnabled()) {
    return res.status(500).json({ error: "Cloudinary is not configured" });
  }

  upload.fields(LOGO_KEYS.map((k) => ({ name: k })))(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const updates: Record<string, string | null> = {};
    const oldUrls: string[] = [];

    const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });

    try {
      for (const key of LOGO_KEYS) {
        const file = files?.[key]?.[0];
        if (file) {
          const oldUrl = config?.[key] as string | null;
          if (oldUrl) oldUrls.push(oldUrl);
          updates[key] = await uploadBuffer(file.buffer, "eventicate/logos", `logo-${key}`);
        }
      }

      if (Object.keys(updates).length > 0) {
        await prisma.systemConfig.upsert({
          where: { id: "default" },
          update: updates,
          create: { id: "default", appName: "Eventicate", ...updates },
        });
      }

      for (const oldUrl of oldUrls) {
        await destroyAsset(oldUrl);
      }

      const updated = await prisma.systemConfig.findUnique({ where: { id: "default" } });
      return res.status(200).json({
        logoLight: updated?.logoLight || null,
        logoDark: updated?.logoDark || null,
        logoInvoice: updated?.logoInvoice || null,
      });
    } catch {
      return res.status(500).json({ error: "Upload failed" });
    }
  });
});

router.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const type = req.query.type as string | undefined;

  if (!type || !LOGO_KEYS.includes(type as (typeof LOGO_KEYS)[number])) {
    return res.status(400).json({ error: "Invalid type" });
  }

  const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  const oldUrl = config?.[type as keyof typeof config] as string | null;

  if (oldUrl) {
    await destroyAsset(oldUrl);
  }

  await prisma.systemConfig.upsert({
    where: { id: "default" },
    update: { [type]: null },
    create: { id: "default", appName: "Eventicate" },
  });

  return res.status(200).json({ success: true });
});

export default router;
