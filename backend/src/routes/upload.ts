import { Router } from "express";
import multer from "multer";
import { uploadBuffer, cloudinaryEnabled } from "../lib/cloudinary";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "svg"];

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

router.post("/", (req, res) => {
  upload.single("file")(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const type = (req.query.type as string) || "services";

    if (!cloudinaryEnabled()) {
      return res.status(500).json({ error: "Cloudinary is not configured" });
    }

    try {
      const url = await uploadBuffer(req.file.buffer, `eventicate/${type}`);
      return res.status(200).json({ url });
    } catch {
      return res.status(500).json({ error: "Upload failed" });
    }
  });
});

export default router;
