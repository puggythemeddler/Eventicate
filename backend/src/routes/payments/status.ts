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
    // The status endpoint is read-only. Confirm the caller owns the payment
    // (or its booking / subscription) before returning any state.
    const payment = await prisma.payment.findFirst({
      where: { transactionId },
      include: { booking: { select: { customerId: true, providerId: true } } },
    });

    if (payment?.booking) {
      const customer = session.role === "CUSTOMER"
        ? await prisma.customerProfile.findUnique({ where: { userId: session.id } })
        : null;
      const provider = session.role === "PROVIDER"
        ? await prisma.providerProfile.findUnique({ where: { userId: session.id } })
        : null;
      const ownsBooking =
        (session.role === "CUSTOMER" && customer?.id === payment.booking.customerId) ||
        (session.role === "PROVIDER" && provider?.id === payment.booking.providerId);
      if (!ownsBooking) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else {
      // Subscription payments: only the owning provider may poll.
      const subscription = await prisma.providerSubscription.findFirst({
        where: { paymentRef: transactionId },
      });
      if (!subscription) {
        return res.status(404).json({ error: "Payment not found" });
      }
      const provider = await prisma.providerProfile.findUnique({ where: { userId: session.id } });
      if (!provider || subscription.providerId !== provider.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    // Read-only: report the upstream status; the M-Pesa callback performs the
    // booking/subscription state transitions when funds actually settle.
    const result = await checkPaymentStatus(gateway, transactionId);
    return res.status(200).json(result);
  } catch {
    return res.status(500).json({ error: "Failed to check payment status" });
  }
});

export default router;