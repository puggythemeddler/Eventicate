import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const router = Router();

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = (req.params as { id: string }).id;

  try {
    const body = req.body;
    const data = z.object({ quantity: z.number().int().positive() }).parse(body);

    const customer = await prisma.customerProfile.findUnique({ where: { userId: session.id } });
    if (!customer) return res.status(404).json({ error: "Customer not found" });

    const item = await prisma.cartItem.findFirst({
      where: { id, customerId: customer.id },
    });
    if (!item) return res.status(404).json({ error: "Cart item not found" });

    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity: data.quantity },
    });

    return res.status(200).json({ item: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to update item" });
  }
});

router.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const id = (req.params as { id: string }).id;

  const customer = await prisma.customerProfile.findUnique({ where: { userId: session.id } });
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const item = await prisma.cartItem.findFirst({
    where: { id, customerId: customer.id },
  });
  if (!item) return res.status(404).json({ error: "Cart item not found" });

  await prisma.cartItem.delete({ where: { id } });

  return res.status(200).json({ success: true });
});

export default router;
