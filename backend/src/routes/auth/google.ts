import { Router } from "express";
import { getGoogleAuthURL, GOOGLE_CONFIG } from "../../lib/google-auth";

const router = Router();

router.get("/", (_req, res) => {
  if (!GOOGLE_CONFIG.clientId) {
    return res.status(501).json({ error: "Google OAuth not configured" });
  }
  return res.redirect(303, getGoogleAuthURL());
});

export default router;
