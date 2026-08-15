import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendPaymentConfirmation } from "@/lib/email";

const splitSchema = z.object({
  masterQuoteId: z.string(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = splitSchema.parse(body);

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
      return NextResponse.json({ error: "No documents found for this master quote" }, { status: 404 });
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

    return NextResponse.json({ payments: results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to process split payments" }, { status: 500 });
  }
}
