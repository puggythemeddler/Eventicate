import { Router } from "express";
import prisma from "../../lib/prisma";
import { extractStkCallback, stkQuery } from "../../lib/mpesa";
import { createNotification } from "../../lib/booking-engine";
import { sendPaymentConfirmation } from "../../lib/email";
import { canPayBooking, bookingStatusAfterPayment } from "../../lib/payment-lifecycle";

export function createMpesaCallbackRouter(
  queryPayment: typeof stkQuery = stkQuery,
  sendConfirmation: typeof sendPaymentConfirmation = sendPaymentConfirmation,
) {
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
        const confirmed = await queryPayment(checkoutRequestId);
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
          // Read, claim and settle together. If a booking is cancelled while a
          // prompt is open, preserve that status and flag the funds for review.
          const settlement = await prisma.$transaction(async (tx) => {
            const current = await tx.payment.findUnique({
              where: { id: payment.id },
              include: { booking: { include: { payments: true } } },
            });
            if (!current?.booking || current.status !== "PENDING") return null;
            const booking = current.booking;
            const alreadyPaid = completedPaymentSum(
              booking.payments
                .filter((p) => p.id !== current.id)
                .map((p) => ({ amount: p.amount.toNumber(), status: p.status }))
            );
            const totalDue = booking.finalPrice?.toNumber() ?? booking.quotedPrice?.toNumber() ?? 0;
            const newTotalPaid = alreadyPaid + current.amount.toNumber();
            const newStatus = newTotalPaid >= totalDue ? "FULLY_PAID" : "DEPOSIT_PAID";
            const requiresReview = !canPayBooking(booking.status);
            const claimed = await tx.payment.updateMany({
              where: { id: current.id, status: "PENDING" },
              data: {
                status: newStatus,
                paidAt: new Date(),
                ...(requiresReview ? { notes: JSON.stringify({ reconciliationRequired: true, bookingStatusAtSettlement: booking.status, previousNotes: current.notes }) } : {}),
              },
            });
            if (claimed.count === 0) return null;
            if (!requiresReview) {
              await tx.booking.update({
                where: { id: current.bookingId! },
                data: {
                  depositPaid: true,
                  status: bookingStatusAfterPayment(booking.status, newStatus === "FULLY_PAID"),
                },
              });
            }
            return { requiresReview };
          }, { isolationLevel: "Serializable" });

          if (settlement) {
            const booking = payment.booking;

            // Notify the customer (confirmation) and the provider (payment received).
            if (booking.customer?.user.email) {
              sendConfirmation(
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
              settlement.requiresReview ? "Payment Needs Review" : "Payment Received",
              settlement.requiresReview
                ? `Payment of ${payment.amount} arrived for an inactive booking. Review the funds; the booking has not been reopened.`
                : `Payment of ${payment.amount} received for booking ${booking.event?.title || ""}`.trim(),
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
                sendConfirmation(
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
        const confirmed = await queryPayment(checkoutRequestId);
        if (confirmed.status === "FAILED") {
          const payment = await prisma.payment.findFirst({
            where: { transactionId: checkoutRequestId, status: "PENDING" },
          });
          if (payment) {
            await prisma.payment.updateMany({
              where: { id: payment.id, status: "PENDING" },
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

  return router;
}

export default createMpesaCallbackRouter();
