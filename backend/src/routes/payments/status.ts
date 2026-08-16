import { Router } from "express";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { checkPaymentStatus, type PaymentGateway } from "../../lib/payments";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const gateway = req.query.gateway as PaymentGateway | null;
  const transactionId = req.query.transactionId as string | undefined;

  if (!gateway || !transactionId) {
    return res.status(400).json({ error: "Missing gateway or transactionId" });
  }

  if (!["mpesa", "pesapal", "stripe"].includes(gateway)) {
    return res.status(400).json({ error: "Invalid gateway" });
  }

  try {
    const result = await checkPaymentStatus(gateway, transactionId);

    if (result.status === "COMPLETED") {
      const payment = await prisma.payment.findFirst({
        where: { transactionId },
        include: { booking: { include: { payments: true, event: true } } },
      });

      if (payment?.booking) {
        const totalPaid = payment.booking.payments.reduce((s, p) => s + p.amount, 0);
        const totalDue = payment.booking.finalPrice || payment.booking.quotedPrice || 0;
        const newStatus = totalPaid >= totalDue ? "FULLY_PAID" : "DEPOSIT_PAID";

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: newStatus, paidAt: new Date() },
        });

        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: { depositPaid: true, status: newStatus === "FULLY_PAID" ? "COMPLETED" : "DEPOSIT_PAID" },
        });
      } else {
        const subscription = await prisma.providerSubscription.findFirst({
          where: { paymentRef: transactionId },
        });

        if (subscription) {
          const now = new Date();
          const days = subscription.billingPeriod === "ANNUAL" ? 365 : 30;
          const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

          await prisma.providerSubscription.update({
            where: { id: subscription.id },
            data: {
              status: "ACTIVE",
              trialStartAt: null,
              trialEndAt: null,
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              cancelledAt: null,
            },
          });
        }
      }
    }

    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: "Failed to check payment status" });
  }
});

export default router;