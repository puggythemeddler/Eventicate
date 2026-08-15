import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { checkPaymentStatus, type PaymentGateway } from "@/lib/payments";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gateway = searchParams.get("gateway") as PaymentGateway | null;
  const transactionId = searchParams.get("transactionId");

  if (!gateway || !transactionId) {
    return NextResponse.json({ error: "Missing gateway or transactionId" }, { status: 400 });
  }

  if (!["mpesa", "pesapal", "stripe"].includes(gateway)) {
    return NextResponse.json({ error: "Invalid gateway" }, { status: 400 });
  }

  try {
    const result = await checkPaymentStatus(gateway, transactionId);

    if (result.success && result.status === "COMPLETED") {
      const payment = await prisma.payment.findFirst({
        where: { transactionId },
        include: { booking: { include: { payments: true, event: true } } },
      });

      if (payment) {
        const totalPaid = payment.booking.payments.reduce((s, p) => s + p.amount, 0);
        const totalDue = payment.booking.finalPrice || payment.booking.quotedPrice || 0;
        const newStatus = totalPaid >= totalDue ? "FULLY_PAID" : "DEPOSIT_PAID";

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: newStatus, paidAt: new Date() },
        });

        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: { depositPaid: true, status: newStatus === "FULLY_PAID" ? "COMPLETED" : "DEPOSIT_PAID" },
        });
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to check payment status" }, { status: 500 });
  }
}
