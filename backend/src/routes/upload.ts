import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "svg"];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const type = (_req.query.type as string) || "services";
    const dir = path.join(process.cwd(), "uploads", type);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const type = (req.query.type as string) || "services";
    const ext = path.extname(file.originalname).toLowerCase().slice(1) || "png";
    const filename = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
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
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    const type = (req.query.type as string) || "services";
    return res.status(200).json({ url: `/uploads/${type}/${req.file.filename}` });
  });
});

export default router;
