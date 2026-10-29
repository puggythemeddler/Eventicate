import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

import resolutionRouter from "./complaint-resolution";
const router = Router();
router.use(resolutionRouter);

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;

  const complaints = await prisma.complaint.findMany({
    where,
    include: {
      reporter: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const bookingIds = [...new Set(complaints.map((c) => c.bookingId).filter(Boolean))] as string[];
  const bookings = bookingIds.length
    ? await prisma.booking.findMany({
        where: { id: { in: bookingIds } },
        select: {
          id: true,
          status: true,
          finalPrice: true,
          quotedPrice: true,
          payments: { select: { amount: true, status: true } },
          agreements: { orderBy: { signedAt: "desc" }, take: 1, select: { terms: true } },
          provider: { select: { businessName: true } },
          customer: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
      })
    : [];
  const bookingMap = new Map(bookings.map(({ payments, agreements, ...booking }) => [booking.id, {
    ...booking,
    settledPaid: payments.filter(p => ["DEPOSIT_PAID", "FULLY_PAID"].includes(p.status)).reduce((sum, p) => sum + p.amount.toNumber(), 0),
    agreementTerms: agreements[0]?.terms ?? null,
  }]));

  const enriched = complaints.map((c) => ({
    ...c,
    booking: c.bookingId ? bookingMap.get(c.bookingId) ?? null : null,
  }));

  return res.status(200).json({ complaints: enriched });
});

export default router;
