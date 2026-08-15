import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const approval = req.query.approval as string | undefined;
  const category = req.query.category as string | undefined;

  const providers = await prisma.providerProfile.findMany({
    where: {
      ...(approval === "pending" ? { isApproved: false } : {}),
      ...(approval === "approved" ? { isApproved: true } : {}),
      ...(category ? { category: category as never } : {}),
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { bookings: true, reviewsReceived: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const pendingCount = await prisma.providerProfile.count({
    where: { isApproved: false },
  });

  return res.status(200).json({ providers, pendingCount });
});

export default router;
