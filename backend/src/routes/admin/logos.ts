import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { unlink } from "fs/promises";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const LOGO_KEYS = ["logoLight", "logoDark", "logoInvoice"] as const;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "logos");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1) || "png";
    cb(null, `${file.fieldname}-${Date.now()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"].includes(file.mimetype)) {
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

  upload.fields(LOGO_KEYS.map((k) => ({ name: k })))(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const updates: Record<string, string | null> = {};

    for (const key of LOGO_KEYS) {
      const file = files?.[key]?.[0];
      if (file) {
        updates[key] = `/uploads/logos/${file.filename}`;
      }
    }

    if (Object.keys(updates).length > 0) {
      await prisma.systemConfig.upsert({
        where: { id: "default" },
        update: updates,
        create: { id: "default", appName: "Eventicate", ...updates },
      });
    }

    const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    return res.status(200).json({
      logoLight: config?.logoLight || null,
      logoDark: config?.logoDark || null,
      logoInvoice: config?.logoInvoice || null,
    });
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
  const oldPath = config?.[type as keyof typeof config] as string | null;

  if (oldPath) {
    const fullPath = path.join(process.cwd(), oldPath);
    try { await unlink(fullPath); } catch {}
  }

  await prisma.systemConfig.upsert({
    where: { id: "default" },
    update: { [type]: null },
    create: { id: "default", appName: "Eventicate" },
  });

  return res.status(200).json({ success: true });
});

export default router;
