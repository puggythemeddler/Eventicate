import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { initiatePayment } from "../../lib/payments";

const splitSchema = z.object({
  masterQuoteId: z.string(),
  phone: z.string().optional(),
});

const router = Router();

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const data = splitSchema.parse(req.body);

    const documents = await prisma.document.findMany({
      where: { masterQuoteId: data.masterQuoteId },
      include: {
        booking: {
          include: {
            event: { select: { title: true } },
            customer: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
            provider: { include: { user: { select: { firstName: true, lastName: true } } } },
            payments: true,
          },
        },
      },
    });

    if (documents.length === 0) {
      return res.status(404).json({ error: "No documents found for this master quote" });
    }

    // Only the customer who owns these bookings may split-pay them.
    const customer = await prisma.customerProfile.findUnique({ where: { userId: session.id } });
    if (!customer) return res.status(403).json({ error: "Forbidden" });
    const foreignBooking = documents.find((doc) => doc.booking && doc.booking.customerId !== customer.id);
    if (foreignBooking) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const results: { bookingId: string; providerName: string; amount: number; status: string; checkoutRequestId?: string; error?: string }[] = [];

    for (const doc of documents) {
      if (!doc.booking) continue;
      const booking = doc.booking;

      const totalPaid = booking.payments
        .filter((p) => p.status === "DEPOSIT_PAID" || p.status === "FULLY_PAID")
        .reduce((sum, p) => sum + p.amount, 0);
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

      const result = await initiatePayment("mpesa", {
        amount: remaining,
        currency: "KES",
        bookingId: booking.id,
        customerEmail: booking.customer?.user?.email || "",
        customerPhone: data.phone || booking.customer?.user?.phone || "",
        customerName: `${booking.customer?.user?.firstName || ""} ${booking.customer?.user?.lastName || ""}`,
        description: `Split payment for ${booking.event?.title || "booking"}`,
      });

      if (!result.success || !result.checkoutRequestId) {
        results.push({
          bookingId: booking.id,
          providerName: booking.provider?.user?.firstName || "Unknown",
          amount: remaining,
          status: "FAILED",
          error: result.error || "Payment initiation failed",
        });
        continue;
      }

      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: remaining,
          method: "MPESA",
          status: "PENDING",
          transactionId: result.checkoutRequestId,
          isDeposit: false,
          notes: `Split payment for master quote ${data.masterQuoteId}`,
        },
      });

      results.push({
        bookingId: booking.id,
        providerName: booking.provider?.user?.firstName || "Unknown",
        amount: remaining,
        status: "PENDING",
        checkoutRequestId: result.checkoutRequestId,
      });
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
