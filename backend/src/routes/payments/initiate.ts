import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { initiatePayment, type PaymentGateway } from "../../lib/payments";
import { paymentLimiter } from "../../lib/rate-limit";

const initiateSchema = z.object({
  gateway: z.enum(["mpesa", "pesapal", "stripe"]),
  bookingId: z.string(),
  amount: z.number().positive(),
  currency: z.enum(["KES", "UGX", "TZS", "USD"]).default("KES"),
  phone: z.string().optional(),
  isDeposit: z.boolean().optional().default(false),
  billingPeriod: z.enum(["MONTHLY", "ANNUAL"]).optional(),
});

const router = Router();

router.post("/", paymentLimiter, async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (session.role !== "CUSTOMER" && session.role !== "PROVIDER") {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const data = initiateSchema.parse(req.body);

    const isSubscription = data.bookingId.startsWith("sub_");

    if (isSubscription) {
      if (session.role !== "PROVIDER") return res.status(403).json({ error: "Forbidden" });
      const provider = await prisma.providerProfile.findUnique({
        where: { userId: session.id },
        include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      });
      if (!provider) return res.status(404).json({ error: "Provider not found" });

      const planId = data.bookingId.slice(4);

      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
      if (!plan) return res.status(404).json({ error: "Plan not found" });
      if (!plan.isActive) return res.status(400).json({ error: "Plan is not active" });
      if (plan.price.toNumber() <= 0) {
        return res.status(400).json({ error: "Free plans do not require payment" });
      }

      // Ignore the client-supplied amount; derive it from the plan server-side.
      const amount =
        data.billingPeriod === "ANNUAL"
          ? (plan.annualPrice?.toNumber() ?? Math.round(plan.price.toNumber() * 12 * 0.85))
          : plan.price.toNumber();

      const result = await initiatePayment(data.gateway as PaymentGateway, {
        amount,
        currency: data.currency,
        bookingId: data.bookingId,
        customerEmail: provider.user.email,
        customerPhone: data.phone || provider.user.phone || "",
        customerName: `${provider.user.firstName} ${provider.user.lastName || ""}`,
        description: `Subscription payment - ${data.gateway}`,
      });

      if (!result.success) {
        return res.status(502).json({ error: result.error || "Payment initiation failed" });
      }

      if (result.checkoutRequestId) {
        await prisma.providerSubscription.upsert({
          where: { providerId: provider.id },
          create: {
            providerId: provider.id,
            planId,
            billingPeriod: data.billingPeriod || "MONTHLY",
            paymentMethod: "MPESA",
            paymentRef: result.checkoutRequestId,
          },
          update: {
            planId,
            billingPeriod: data.billingPeriod || "MONTHLY",
            paymentMethod: "MPESA",
            paymentRef: result.checkoutRequestId,
          },
        });
      }

      return res.status(200).json(result);
    }

    if (session.role !== "CUSTOMER") return res.status(403).json({ error: "Forbidden" });

    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId },
      include: {
        customer: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
        event: { select: { title: true } },
        payments: true,
      },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Only the booking's customer may initiate payment.
    const customer = await prisma.customerProfile.findUnique({ where: { userId: session.id } });
    if (!customer || booking.customerId !== customer.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const totalDue = booking.finalPrice?.toNumber() ?? booking.quotedPrice?.toNumber() ?? 0;
    const totalPaid = booking.payments
      .filter((p) => p.status === "DEPOSIT_PAID" || p.status === "FULLY_PAID")
      .reduce((sum, p) => sum + p.amount.toNumber(), 0);
    const remaining = Math.max(0, totalDue - totalPaid);

    if (data.isDeposit) {
      // Never trust the client amount: derive the deposit server-side.
      const depositAmount = booking.depositAmount?.toNumber() ?? Math.round(totalDue * 0.3 * 100) / 100;
      if (depositAmount <= 0) {
        return res.status(400).json({ error: "No deposit is due for this booking" });
      }
      if (data.amount !== depositAmount) {
        return res.status(400).json({ error: "Amount does not match deposit amount" });
      }
      if (booking.depositPaid) {
        return res.status(400).json({ error: "Deposit already paid" });
      }
      if (depositAmount > remaining) {
        return res.status(400).json({ error: "Amount exceeds remaining balance" });
      }
      // Use the server-derived amount for the STK push and the payment row.
      data.amount = depositAmount;
    } else {
      if (data.amount > remaining) {
        return res.status(400).json({ error: "Amount exceeds remaining balance" });
      }
    }

    const result = await initiatePayment(data.gateway as PaymentGateway, {
      amount: data.amount,
      currency: data.currency,
      bookingId: data.bookingId,
      customerEmail: booking.customer.user.email,
      customerPhone: data.phone || booking.customer.user.phone || "",
      customerName: `${booking.customer.user.firstName} ${booking.customer.user.lastName}`,
      description: `Payment for ${booking.event?.title || "booking"} - ${data.gateway}`,
    });

    if (!result.success) {
      return res.status(502).json({ error: result.error || "Payment initiation failed" });
    }

    const methodMap: Record<string, string> = {
      mpesa: "MPESA",
      pesapal: "PESAPAL",
      stripe: "CARD",
    };

    await prisma.payment.create({
      data: {
        bookingId: data.bookingId,
        amount: data.amount,
        method: methodMap[data.gateway] as "MPESA" | "PESAPAL" | "CARD",
        status: "PENDING",
        transactionId: result.transactionId,
        isDeposit: data.isDeposit,
        notes: JSON.stringify({ gateway: data.gateway, checkoutRequestId: result.checkoutRequestId }),
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Payment initiation failed" });
  }
});

export default router;
