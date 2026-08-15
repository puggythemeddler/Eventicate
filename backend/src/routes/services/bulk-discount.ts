import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const bulkDiscountSchema = z.object({
  discountPercent: z.number().min(0).max(100),
});

const router = Router();

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) return res.status(404).json({ error: "Provider not found" });

  try {
    const data = bulkDiscountSchema.parse(req.body);

    await prisma.service.updateMany({
      where: { providerId: provider.id, isActive: true },
      data: { discountPercent: data.discountPercent },
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to apply bulk discount" });
  }
});

export default router;
