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

  try {
    const data = paymentSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        provider: { include: { user: true } },
        customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        event: { select: { title: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const payment = await prisma.payment.create({
      data: {
        bookingId: data.bookingId,
        amount: data.amount,
        method: data.method,
        isDeposit: data.isDeposit,
        status: "DEPOSIT_PAID",
        transactionId: `TXN-${Date.now()}`,
        paidAt: new Date(),
      },
    });

    await prisma.booking.update({
      where: { id: data.bookingId },
      data: {
        depositPaid: data.isDeposit,
        status: data.isDeposit ? "DEPOSIT_PAID" : "CONFIRMED",
      },
    });

    await createNotification(
      booking.provider.userId,
      "PAYMENT",
      "Payment Received",
      `Payment of $${data.amount} received for booking`,
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
