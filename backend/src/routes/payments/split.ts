import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { sendPaymentConfirmation } from "../../lib/email";

const splitSchema = z.object({
  masterQuoteId: z.string(),
});

const router = Router();

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const data = splitSchema.parse(req.body);

    const documents = await prisma.document.findMany({
      where: { masterQuoteId: data.masterQuoteId },
      include: {
        booking: {
          include: {
            event: { select: { title: true } },
            customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
            provider: { include: { user: { select: { firstName: true, lastName: true } } } },
            payments: true,
          },
        },
      },
    });

    if (documents.length === 0) {
      return res.status(404).json({ error: "No documents found for this master quote" });
    }

    const results: { bookingId: string; providerName: string; amount: number; status: string }[] = [];

    for (const doc of documents) {
      if (!doc.booking) continue;
      const booking = doc.booking;

      const totalPaid = booking.payments.reduce((sum, p) => sum + p.amount, 0);
      const totalDue = booking.finalPrice || booking.quotedPrice || 0;
      const remaining = Math.max(0, totalDue - totalPaid);

      if (remaining <= 0) {
        results.push({
          bookingId: booking.id,
          providerName: booking.provider?.user?.firstName || "Unknown",
          amount: 0,
          status: "ALREADY_PAID",
        });
        continue;
      }

      const payment = await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: remaining,
          method: "CARD",
          status: "PENDING",
          isDeposit: false,
          notes: `Split payment for master quote ${data.masterQuoteId}`,
        },
      });

      results.push({
        bookingId: booking.id,
        providerName: booking.provider?.user?.firstName || "Unknown",
        amount: remaining,
        status: payment.status,
      });

      if (booking.customer?.user?.email) {
        sendPaymentConfirmation(
          booking.customer.user.email,
          booking.customer.user.firstName,
          {
            amount: remaining,
            method: "CARD",
            ref: payment.id.slice(-8),
            eventName: booking.event?.title || "Event",
          }
        ).catch(() => {});
      }
    }

    return res.status(200).json({ payments: results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to process split payments" });
  }
});

export default router;
