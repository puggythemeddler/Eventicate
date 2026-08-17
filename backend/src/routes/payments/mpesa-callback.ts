import { Router } from "express";
import prisma from "../../lib/prisma";
import { extractStkCallback, stkQuery } from "../../lib/mpesa";

const router = Router();

function completedPaymentSum(payments: { amount: number; status: string }[]): number {
  return payments
    .filter((p) => p.status === "DEPOSIT_PAID" || p.status === "FULLY_PAID")
    .reduce((s, p) => s + p.amount, 0);
}

router.post("/", async (req, res) => {
  try {
    // Reject requests that don't carry the shared callback secret when one is configured.
    const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
    const callbackSecret = config?.mpesaCallbackSecret || process.env.MPESA_CALLBACK_SECRET || "";
    if (callbackSecret && req.get("x-eventicate-callback") !== callbackSecret) {
      return res.status(401).json({ ResultCode: 1, ResultDesc: "Unauthorized" });
    }

    const cb = extractStkCallback(req.body);

    if (!cb.checkoutRequestId) {
      return res.status(400).json({ ResultCode: 1, ResultDesc: "Missing CheckoutRequestID" });
    }

    const checkoutRequestId = cb.checkoutRequestId;

    if (cb.resultCode === "0") {
      // Defense in depth: confirm with Safaricom before trusting a callback body.
      const confirmed = await stkQuery(checkoutRequestId);
      if (confirmed.status !== "COMPLETED") {
        return res.status(400).json({ ResultCode: 1, ResultDesc: "Payment not confirmed with provider" });
      }

      // Validate the callback amount matches the recorded payment amount.
      const recorded = await prisma.payment.findFirst({ where: { transactionId: checkoutRequestId } });
      if (recorded && cb.amount && Math.round(recorded.amount) !== Math.round(cb.amount)) {
        return res.status(400).json({ ResultCode: 1, ResultDesc: "Amount mismatch" });
      }

      // Find a booking payment row by its transactionId (set to the checkout request id at initiate).
      const payment = await prisma.payment.findFirst({
        where: { transactionId: checkoutRequestId },
        include: { booking: { include: { payments: true, event: true } } },
      });

      if (payment?.booking) {
        const booking = payment.booking;
        // Only completed payments count toward the balance.
        const alreadyPaid = completedPaymentSum(booking.payments);
        const totalDue = booking.finalPrice || booking.quotedPrice || 0;
        const isAlreadyCompleted = payment.status === "DEPOSIT_PAID" || payment.status === "FULLY_PAID";
        const newTotalPaid = alreadyPaid + (isAlreadyCompleted ? 0 : payment.amount);
        const newStatus = newTotalPaid >= totalDue ? "FULLY_PAID" : "DEPOSIT_PAID";

        // Atomically mark the payment paid and update the booking.
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: newStatus, paidAt: new Date() },
          }),
          prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
              depositPaid: true,
              status: newStatus === "FULLY_PAID" ? "COMPLETED" : "DEPOSIT_PAID",
            },
          }),
        ]);
      } else {
        // Subscription payment — the ProviderSubscription.paymentRef holds the checkout request id.
        const subscription = await prisma.providerSubscription.findFirst({
          where: { paymentRef: checkoutRequestId },
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
              paymentRef: cb.receipt || subscription.paymentRef,
            },
          });
        }
      }
    } else if (paymentFailed(cb.resultCode)) {
      const payment = await prisma.payment.findFirst({
        where: { transactionId: checkoutRequestId },
      });
      if (payment) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
      }
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  } catch {
    return res.status(500).json({ ResultCode: 1, ResultDesc: "Internal error" });
  }
});

function paymentFailed(resultCode: string | undefined): boolean {
  if (!resultCode) return false;
  const failedCodes = ["1032", "1036", "1037", "2001", "1"];
  return failedCodes.includes(resultCode);
}

export default router;