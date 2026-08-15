import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  const methods = [
    { id: "mpesa", name: "M-Pesa", description: "Pay with M-Pesa mobile money", icon: "smartphone" },
    { id: "pesapal", name: "PesaPal", description: "Pay with PesaPal", icon: "credit-card" },
    { id: "stripe", name: "Credit/Debit Card", description: "Pay with Visa, Mastercard", icon: "credit-card" },
  ];

  return res.status(200).json({ methods });
});

export default router;
