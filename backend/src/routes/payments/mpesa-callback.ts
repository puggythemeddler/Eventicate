import { Router } from "express";
import prisma from "../../lib/prisma";
import { extractStkCallback, stkQuery } from "../../lib/mpesa";
import { createNotification } from "../../lib/booking-engine";
import { sendPaymentConfirmation } from "../../lib/email";

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
      if (recorded && cb.amount && Math.round(recorded.amount.toNumber()) !== Math.round(cb.amount)) {
        return res.status(400).json({ ResultCode: 1, ResultDesc: "Amount mismatch" });
      }

      // Find a booking payment row by its transactionId (set to the checkout request id at initiate).
      const payment = await prisma.payment.findFirst({
        where: { transactionId: checkoutRequestId },
        include: {
          booking: {
            include: {
              payments: true,
              event: true,
              customer: { include: { user: { select: { email: true, firstName: true } } } },
              provider: { include: { user: { select: { email: true, firstName: true } } } },
            },
          },
        },
      });

      if (payment?.booking) {
        const booking = payment.booking;
        // Idempotency guard: only a PENDING payment may be settled, so a duplicate
        // callback (or a concurrent one) is a safe no-op.
        const claimed = await prisma.payment.updateMany({
          where: { id: payment.id, status: "PENDING" },
          data: { status: "FULLY_PAID", paidAt: new Date() },
        });

        if (claimed.count > 0) {
          const alreadyPaid = completedPaymentSum(
            booking.payments
              .filter((p) => p.id !== payment.id)
              .map((p) => ({ amount: p.amount.toNumber(), status: p.status }))
          );
          const totalDue = booking.finalPrice?.toNumber() ?? booking.quotedPrice?.toNumber() ?? 0;
          const newTotalPaid = alreadyPaid + payment.amount.toNumber();
          const newStatus = newTotalPaid >= totalDue ? "FULLY_PAID" : "DEPOSIT_PAID";

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

          // Notify the customer (confirmation) and the provider (payment received).
          if (booking.customer?.user.email) {
            sendPaymentConfirmation(
              booking.customer.user.email,
              booking.customer.user.firstName,
              {
                amount: payment.amount.toNumber(),
                method: "MPESA",
                ref: cb.receipt || checkoutRequestId,
                eventName: booking.event?.title || "Booking",
              }
            ).catch((e) => console.error("Payment confirmation email failed:", e));
          }
          await createNotification(
            booking.provider.userId,
            "PAYMENT",
            "Payment Received",
            `Payment of ${payment.amount} received for booking ${booking.event?.title || ""}`.trim(),
            `/provider/bookings/${payment.bookingId}`
          );
        }
      } else {
        // Subscription payment — the ProviderSubscription.paymentRef holds the checkout request id.
        const subscription = await prisma.providerSubscription.findFirst({
          where: { paymentRef: checkoutRequestId },
          include: { provider: { include: { user: { select: { email: true, firstName: true } } } } },
        });

        if (subscription) {
          // Never trust the callback amount blindly: verify it matches the plan price.
          const plan = await prisma.subscriptionPlan.findUnique({
            where: { id: subscription.planId },
          });
          const expected =
            subscription.billingPeriod === "ANNUAL"
              ? (plan?.annualPrice?.toNumber() ?? (plan ? Math.round(plan.price.toNumber() * 12 * 0.85) : undefined))
              : plan?.price?.toNumber();
          if (cb.amount && expected != null && Math.round(cb.amount) !== Math.round(expected)) {
            return res.status(400).json({ ResultCode: 1, ResultDesc: "Amount mismatch" });
          }

          const now = new Date();
          const alreadyActive =
            subscription.status === "ACTIVE" &&
            subscription.currentPeriodEnd != null &&
            subscription.currentPeriodEnd > now;

          if (!alreadyActive) {
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

            if (subscription.provider?.user.email) {
              sendPaymentConfirmation(
                subscription.provider.user.email,
                subscription.provider.user.firstName,
                {
                  amount: paymentAmountOr(cb.amount, expected),
                  method: "MPESA",
                  ref: cb.receipt || checkoutRequestId,
                  eventName: "Eventicate subscription",
                }
              ).catch((e) => console.error("Subscription payment email failed:", e));
            }
          }
        }
      }
    } else if (paymentFailed(cb.resultCode)) {
      // A failure callback must be verified against Safaricom too, so an unauthenticated
      // request cannot flip a live payment to FAILED.
      const confirmed = await stkQuery(checkoutRequestId);
      if (confirmed.status === "FAILED") {
        const payment = await prisma.payment.findFirst({
          where: { transactionId: checkoutRequestId, status: "PENDING" },
        });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED", notes: cb.resultDesc || "Payment failed" },
          });
        }
      }
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  } catch {
    return res.status(500).json({ ResultCode: 1, ResultDesc: "Internal error" });
  }
});

function paymentAmountOr(callbackAmount: number | undefined, fallback: number | undefined): number {
  return typeof callbackAmount === "number" ? callbackAmount : fallback ?? 0;
}

function paymentFailed(resultCode: string | undefined): boolean {
  if (!resultCode) return false;
  const failedCodes = ["1032", "1036", "1037", "2001", "1"];
  return failedCodes.includes(resultCode);
}

export default router;