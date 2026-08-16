import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const id = (req.params as { id: string }).id;

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return res.status(404).json({ error: "Customer profile not found" });

  const event = await prisma.event.findFirst({
    where: { id, customerId: customer.id },
    include: {
      bookings: {
        include: {
          provider: { select: { businessName: true, category: true } },
          service: true,
        },
      },
    },
  });

  if (!event) return res.status(404).json({ error: "Event not found" });

  return res.status(200).json({ event });
});

export default router;
