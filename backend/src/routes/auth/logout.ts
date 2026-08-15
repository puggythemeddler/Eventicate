import { Router } from "express";
import { clearSessionCookie } from "../../lib/auth";

const router = Router();

router.post("/", (_req, res) => {
  clearSessionCookie(res);
  return res.status(200).json({ success: true });
});

export default router;
