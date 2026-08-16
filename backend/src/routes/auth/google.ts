import { Router } from "express";
import { getGoogleAuthURL, GOOGLE_CONFIG } from "../../lib/google-auth";

const router = Router();

router.get("/", (_req, res) => {
  if (!GOOGLE_CONFIG.clientId) {
    const appUrl = process.env.APP_URL || "";
    return res.redirect(303, `${appUrl}/auth/login?error=google_auth_failed`);
  }
  return res.redirect(303, getGoogleAuthURL());
});

export default router;
