import { Router } from "express";
import prisma from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  return res.status(200).json({
    logoInvoice: config?.logoInvoice || null,
  });
});

export default router;
