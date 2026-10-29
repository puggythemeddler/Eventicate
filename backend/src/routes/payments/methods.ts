import { Router } from "express";
import { getMpesaReadiness } from "../../lib/mpesa";

const router = Router();

router.get("/", async (req, res) => {
  const readiness = await getMpesaReadiness();
  const methods = readiness.configured ? [
    { id: "mpesa", name: readiness.environment === "sandbox" ? "M-Pesa sandbox" : "M-Pesa", description: readiness.environment === "sandbox" ? "Test environment — no real money is collected" : "Pay with M-Pesa mobile money", icon: "smartphone" },
  ] : [];

  return res.status(200).json({ methods, environment: readiness.environment, unavailableReason: readiness.configured ? null : "Online payments are not configured yet. Contact the provider before making any payment." });
});

export default router;
