import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { createNotification } from "../lib/booking-engine";
import { generateReceiptFromPayment } from "../lib/documents";
import { canPayBooking, bookingStatusAfterPayment } from "../lib/payment-lifecycle";

const paymentSchema = z.object({
  bookingId: z.string(),
  amount: z.number().positive(),
  method: z.enum(["CARD", "BANK_TRANSFER", "CASH", "MOBILE_MONEY"]).default("CARD"),
  isDeposit: z.boolean().default(false),
});

export function createManualPaymentRouter(makeReceipt: typeof generateReceiptFromPayment = generateReceiptFromPayment) {
  const router = Router();

  router.post("/", async (req, res) => {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: "Unauthorized" });
    // Manual/offline payments (cash, bank transfer, mobile money) may only be
    // recorded by the booking's provider or an admin — never self-certified by the customer.
    if (session.role !== "PROVIDER" && session.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden" });
    }

    try {
      const data = paymentSchema.parse(req.body);

      const { booking, payment } = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: data.bookingId },
          include: {
            provider: { include: { user: true } },
            customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
            event: { select: { title: true } },
            payments: true,
          },
        });
        if (!booking) throw Object.assign(new Error("Booking not found"), { status: 404 });

        // Providers may only record payments for their own bookings.
        if (session.role === "PROVIDER") {
          const provider = await tx.providerProfile.findUnique({ where: { userId: session.id } });
          if (!provider || booking.providerId !== provider.id) {
            throw Object.assign(new Error("Forbidden"), { status: 403 });
          }
        }

        if (!canPayBooking(booking.status)) {
          throw Object.assign(new Error("This booking cannot accept payments in its current status"), { status: 409 });
        }

        // Only count completed payments toward the balance.
        const totalPaid = booking.payments
          .filter((p) => p.status === "DEPOSIT_PAID" || p.status === "FULLY_PAID")
          .reduce((sum, p) => sum + p.amount.toNumber(), 0);
        const totalDue = booking.finalPrice?.toNumber() ?? booking.quotedPrice?.toNumber() ?? 0;

        if (data.isDeposit) {
          if (booking.depositPaid) throw Object.assign(new Error("Deposit already paid"), { status: 400 });
          const deposit = booking.depositAmount?.toNumber() ?? totalDue * 0.3;
          if (data.amount < deposit) throw Object.assign(new Error("Amount is less than the deposit due"), { status: 400 });
        }
        if (data.amount > Math.max(0, totalDue - totalPaid)) {
          throw Object.assign(new Error("Amount exceeds remaining balance"), { status: 400 });
        }
        const fullyPaid = totalPaid + data.amount >= totalDue;

        const payment = await tx.payment.create({
          data: {
            bookingId: data.bookingId,
            amount: data.amount,
            method: data.method,
            isDeposit: data.isDeposit,
            status: fullyPaid ? "FULLY_PAID" : "DEPOSIT_PAID",
            transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            paidAt: new Date(),
          },
        });

        await tx.booking.update({
          where: { id: data.bookingId },
          data: {
            depositPaid: true,
            status: bookingStatusAfterPayment(booking.status, fullyPaid),
          },
        });
        return { booking, payment };
      }, { isolationLevel: "Serializable" });

      await createNotification(
        booking.provider.userId,
        "PAYMENT",
        "Payment Received",
        `Payment of ${data.amount} received for booking`,
        `/provider/bookings/${data.bookingId}`
      );

      await makeReceipt(
        {
          id: booking.id,
          provider: { userId: booking.provider.userId, businessName: booking.provider.businessName },
          customer: { userId: booking.customer.userId, user: booking.customer.user },
          depositPaid: true,
          depositAmount: booking.depositAmount?.toNumber() ?? null,
          event: booking.event,
        },
        { amount: data.amount, method: data.method, isDeposit: data.isDeposit, paidAt: new Date() },
        booking.event?.title
      );

      return res.status(201).json({ payment });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      const failure = error as { status?: number; code?: string; message?: string };
      if (failure.status) return res.status(failure.status).json({ error: failure.message });
      if (failure.code === "P2034") return res.status(409).json({ error: "Booking or balance changed. Refresh before recording payment." });
      return res.status(500).json({ error: "Payment failed" });
    }
  });

  return router;
}

export default createManualPaymentRouter();
