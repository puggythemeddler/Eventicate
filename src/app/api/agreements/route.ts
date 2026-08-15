import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendDocumentNotification } from "@/lib/email";

const agreementSchema = z.object({
  bookingId: z.string(),
  documentId: z.string().optional(),
  customerName: z.string().min(1),
  customerPhone: z.string().min(1),
  customerEmail: z.string().email(),
  customerAddress: z.string().optional(),
  signature: z.string().min(1),
  terms: z.string().min(1),
  totalAmount: z.number().positive(),
  depositAmount: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = agreementSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { provider: { include: { user: true } } },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    const existing = await prisma.agreement.findFirst({
      where: { bookingId: data.bookingId },
    });
    if (existing) {
      return NextResponse.json({ error: "Agreement already exists for this booking" }, { status: 409 });
    }

    let ipAddress: string | null = null;
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      ipAddress = forwarded.split(",")[0].trim();
    } else {
      ipAddress = request.headers.get("x-real-ip") || null;
    }

    const agreement = await prisma.agreement.create({
      data: {
        bookingId: data.bookingId,
        documentId: data.documentId || null,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        customerAddress: data.customerAddress || null,
        signature: data.signature,
        terms: data.terms,
        totalAmount: data.totalAmount,
        depositAmount: data.depositAmount || null,
        ipAddress,
      },
    });

    if (data.documentId) {
      await prisma.document.update({
        where: { id: data.documentId },
        data: { status: "ACCEPTED" },
      });
    }

    sendDocumentNotification(
      data.customerEmail,
      data.customerName,
      {
        type: "Agreement",
        number: agreement.id.slice(-8).toUpperCase(),
        url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/bookings/${data.bookingId}`,
      }
    ).catch((e) => console.error("Agreement notification failed:", e));

    return NextResponse.json({ agreement }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create agreement" }, { status: 500 });
  }
}
