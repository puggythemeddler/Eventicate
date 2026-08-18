import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { sendDocumentNotification } from "../lib/email";

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
const router = Router();

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "CUSTOMER") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const data = agreementSchema.parse(req.body);

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { provider: { include: { user: true } } },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    const customer = await prisma.customerProfile.findUnique({
      where: { userId: session.id },
    });
    if (!customer || booking.customerId !== customer.id) {
      return res.status(403).json({ error: "You can only sign agreements for your own bookings" });
    }

    // Cross-check the amount the customer signed against the booking's real price.
    const expectedTotal = booking.finalPrice || booking.quotedPrice || null;
    if (expectedTotal === null) {
      return res.status(400).json({ error: "Booking has no price yet" });
    }
    if (Math.abs(expectedTotal - data.totalAmount) > 0.001) {
      return res.status(400).json({ error: "Signed amount does not match the booking total" });
    }
    if (data.depositAmount && (data.depositAmount <= 0 || data.depositAmount > expectedTotal)) {
      return res.status(400).json({ error: "Invalid deposit amount" });
    }

    const existing = await prisma.agreement.findFirst({
      where: { bookingId: data.bookingId },
    });
    if (existing) {
      return res.status(409).json({ error: "Agreement already exists for this booking" });
    }

    // The linked document (if any) must belong to this booking and to this customer,
    // otherwise a customer could force-accept another provider's (or booking's) document.
    if (data.documentId) {
      const doc = await prisma.document.findUnique({ where: { id: data.documentId } });
      if (!doc) return res.status(404).json({ error: "Document not found" });
      if (doc.bookingId !== data.bookingId) {
        return res.status(400).json({ error: "Document does not belong to this booking" });
      }
      if (doc.recipientId !== session.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    let ipAddress: string | null = null;
    const forwarded = req.headers["x-forwarded-for"];
    if (forwarded) {
      ipAddress = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
    } else {
      const realIp = req.headers["x-real-ip"];
      ipAddress = realIp ? (Array.isArray(realIp) ? realIp[0] : realIp) : null;
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

    return res.status(201).json({ agreement });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to create agreement" });
  }
});

export default router;
