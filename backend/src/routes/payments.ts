import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { createNotification } from "../lib/booking-engine";
import { generateReceiptFromPayment } from "../lib/documents";

const paymentSchema = z.object({
  bookingId: z.string(),
  amount: z.number().positive(),
  method: z.enum(["CARD", "BANK_TRANSFER", "CASH", "MOBILE_MONEY"]).default("CARD"),
  isDeposit: z.boolean().default(false),
});

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

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        provider: { include: { user: true } },
        customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        event: { select: { title: true } },
        payments: true,
      },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Providers may only record payments for their own bookings.
    if (session.role === "PROVIDER") {
      const provider = await prisma.providerProfile.findUnique({ where: { userId: session.id } });
      if (!provider || booking.providerId !== provider.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    // Only count completed payments toward the balance.
    const totalPaid = booking.payments
      .filter((p) => p.status === "DEPOSIT_PAID" || p.status === "FULLY_PAID")
      .reduce((sum, p) => sum + p.amount, 0);
    const totalDue = booking.finalPrice || booking.quotedPrice || 0;

    if (data.isDeposit) {
      if (booking.depositPaid) return res.status(400).json({ error: "Deposit already paid" });
      const deposit = booking.depositAmount ?? totalDue * 0.3;
      if (data.amount < deposit) return res.status(400).json({ error: "Amount is less than the deposit due" });
    } else if (data.amount > Math.max(0, totalDue - totalPaid)) {
      return res.status(400).json({ error: "Amount exceeds remaining balance" });
    }

    const payment = await prisma.payment.create({
      data: {
        bookingId: data.bookingId,
        amount: data.amount,
        method: data.method,
        isDeposit: data.isDeposit,
        status: "DEPOSIT_PAID",
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        paidAt: new Date(),
      },
    });

    const fullyPaid = totalPaid + data.amount >= totalDue;
    await prisma.booking.update({
      where: { id: data.bookingId },
      data: {
        depositPaid: true,
        status: fullyPaid ? "COMPLETED" : "DEPOSIT_PAID",
      },
    });

    await createNotification(
      booking.provider.userId,
      "PAYMENT",
      "Payment Received",
      `Payment of ${data.amount} received for booking`,
      `/provider/bookings/${data.bookingId}`
    );

    await generateReceiptFromPayment(
      booking,
      { amount: data.amount, method: data.method, isDeposit: data.isDeposit, paidAt: new Date() },
      booking.event?.title
    );

    return res.status(201).json({ payment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Payment failed" });
  }
});

export default router;
