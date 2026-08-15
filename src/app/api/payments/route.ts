import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/booking-engine";
import { generateReceiptFromPayment } from "@/lib/documents";

const paymentSchema = z.object({
  bookingId: z.string(),
  amount: z.number().positive(),
  method: z.enum(["CARD", "BANK_TRANSFER", "CASH", "MOBILE_MONEY"]).default("CARD"),
  isDeposit: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = paymentSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        provider: { include: { user: true } },
        customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        event: { select: { title: true } },
      },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

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

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Payment failed" }, { status: 500 });
  }
}
