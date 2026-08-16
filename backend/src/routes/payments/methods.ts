import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  const methods = [
    { id: "mpesa", name: "M-Pesa", description: "Pay with M-Pesa mobile money", icon: "smartphone" },
  ];

  return res.status(200).json({ methods });
});

export default router;
