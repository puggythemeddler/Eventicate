import { Router } from "express";
import multer from "multer";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { uploadBuffer, cloudinaryEnabled, sanitizeFolderName } from "../lib/cloudinary";
import { uploadLimiter } from "../lib/rate-limit";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "doc", "docx"];
const ALLOWED_FOLDER_TYPES = [
  "services",
  "venues",
  "equipment",
  "vehicles",
  "menuPackages",
  "photoPackages",
  "logos",
  "providers",
  "verification",
  "complaints",
  "messages",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"));
    }
    const ext = file.originalname.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error("Invalid file extension"));
    }
    cb(null, true);
  },
});

const router = Router();

router.post("/", uploadLimiter, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!cloudinaryEnabled()) {
      return res.status(500).json({ error: "Cloudinary is not configured" });
    }

    const type = (req.query.type as string) || "services";
    if (!ALLOWED_FOLDER_TYPES.includes(type)) {
      return res.status(400).json({ error: "Invalid upload folder type" });
    }

    // Role gate: providers upload their own content, admins handle branding/global,
    // and message attachments are allowed for any logged-in user.
    const PROVIDER_FOLDERS = new Set([
      "services", "venues", "equipment", "vehicles", "menuPackages", "photoPackages", "verification", "complaints",
    ]);
    const ADMIN_FOLDERS = new Set(["logos", "providers", "verification", "complaints"]);
    if (session.role === "CUSTOMER" && type !== "messages" && type !== "complaints") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (session.role === "PROVIDER" && !PROVIDER_FOLDERS.has(type) && type !== "messages") {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (session.role === "ADMIN" && !ADMIN_FOLDERS.has(type) && type !== "messages") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const provider = await prisma.providerProfile.findUnique({
      where: { userId: session.id },
      select: { businessName: true },
    });

    const folderName = (provider?.businessName || (session.role === "ADMIN" ? "admin" : session.role.toLowerCase())).trim();
    const safeFolder = sanitizeFolderName(folderName);

    try {
      const url = await uploadBuffer(req.file.buffer, `eventicate/${safeFolder}/${type}`);
      return res.status(200).json({ url });
    } catch {
      return res.status(500).json({ error: "Upload failed" });
    }
  });
});

export default router;