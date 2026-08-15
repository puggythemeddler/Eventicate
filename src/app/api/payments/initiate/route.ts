import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { initiatePayment, type PaymentGateway } from "@/lib/payments";
import { sendPaymentConfirmation } from "@/lib/email";

const initiateSchema = z.object({
  gateway: z.enum(["mpesa", "pesapal", "stripe"]),
  bookingId: z.string(),
  amount: z.number().positive(),
  currency: z.enum(["KES", "USD"]).default("KES"),
  phone: z.string().optional(),
  isDeposit: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = initiateSchema.parse(body);

    const isSubscription = data.bookingId.startsWith("sub_");

    if (isSubscription) {
      const provider = await prisma.providerProfile.findUnique({
        where: { userId: session.id },
        include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } },
      });
      if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

      const result = await initiatePayment(data.gateway as PaymentGateway, {
        amount: data.amount,
        currency: data.currency,
        bookingId: data.bookingId,
        customerEmail: provider.user.email,
        customerPhone: data.phone || provider.user.phone || "",
        customerName: `${provider.user.firstName} ${provider.user.lastName || ""}`,
        description: `Subscription payment - ${data.gateway}`,
      });

      if (!result.success) {
        return NextResponse.json({ error: result.error || "Payment initiation failed" }, { status: 502 });
      }

      return NextResponse.json(result, { status: 200 });
    }

    const booking = await prisma.booking.findFirst({
      where: { id: data.bookingId },
      include: {
        customer: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
        event: { select: { title: true } },
        payments: true,
      },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    if (data.isDeposit) {
      if (booking.depositAmount && data.amount !== booking.depositAmount) {
        return NextResponse.json({ error: "Amount does not match deposit amount" }, { status: 400 });
      }
      if (booking.depositPaid) {
        return NextResponse.json({ error: "Deposit already paid" }, { status: 400 });
      }
    } else {
      const totalPaid = booking.payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = (booking.finalPrice || booking.quotedPrice || 0) - totalPaid;
      if (data.amount > remaining) {
        return NextResponse.json({ error: "Amount exceeds remaining balance" }, { status: 400 });
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
      return NextResponse.json({ error: result.error || "Payment initiation failed" }, { status: 502 });
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

    if (data.isDeposit) {
      await prisma.booking.update({
        where: { id: data.bookingId },
        data: { depositPaid: true, status: "DEPOSIT_PAID" },
      });
    }

    sendPaymentConfirmation(booking.customer.user.email, booking.customer.user.firstName, {
      amount: data.amount,
      method: methodMap[data.gateway],
      ref: result.transactionId || "",
      eventName: booking.event?.title || "Booking",
    }).catch((e) => console.error("Payment confirmation email failed:", e));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Payment initiation failed" }, { status: 500 });
  }
}
