import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const customer = await prisma.customerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!customer) return res.status(404).json({ error: "Customer profile not found" });

  const [events, recentBookings] = await Promise.all([
    prisma.event.findMany({
      where: { customerId: customer.id },
      take: 5,
      orderBy: { eventDate: "asc" },
      include: { _count: { select: { bookings: true } } },
    }),
    prisma.booking.findMany({
      where: { customerId: customer.id },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        provider: true,
        event: true,
      },
    }),
  ]);

  return res.status(200).json({ events, recentBookings });
});

export default router;
