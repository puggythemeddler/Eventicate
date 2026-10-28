import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { sendDocumentNotification } from "../lib/email";

const agreementSchema = z.object({
  bookingId: z.string().min(1),
  documentId: z.string().min(1),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().min(1),
  customerEmail: z.string().email(),
  customerAddress: z.string().optional(),
  signature: z.string().trim().min(1),
  terms: z.string().min(1),
  totalAmount: z.number().positive(),
  depositAmount: z.number().nonnegative().optional(),
});

function fail(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}

export function createAgreementsRouter(sendNotice: typeof sendDocumentNotification = sendDocumentNotification) {
  const router = Router();
  router.post("/", async (req, res) => {
    const session = await getSession(req);
    if (!session || session.role !== "CUSTOMER") return res.status(401).json({ error: "Unauthorized" });

    try {
      const data = agreementSchema.parse(req.body);
      const agreement = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { id: data.bookingId },
          include: { provider: { select: { userId: true } } },
        });
        if (!booking) fail(404, "Booking not found");
        const customer = await tx.customerProfile.findUnique({ where: { userId: session.id } });
        if (!customer || booking.customerId !== customer.id) fail(403, "You can only sign agreements for your own bookings");
        if (["CANCELLED", "REJECTED", "COMPLETED"].includes(booking.status)) fail(409, "This booking is no longer open for signing");
        const existing = await tx.agreement.findFirst({ where: { bookingId: booking.id } });
        if (existing) fail(409, "Agreement already exists for this booking");

        const quote = await tx.document.findFirst({
          where: { bookingId: booking.id, type: "QUOTE", status: { notIn: ["CANCELLED", "REJECTED"] } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });
        if (!quote || quote.id !== data.documentId) fail(409, "The quotation has changed. Reload the agreement before signing.");
        if (quote.recipientId !== session.id || quote.senderId !== booking.provider.userId) fail(403, "Forbidden");
        const expectedTotal = booking.finalPrice?.toNumber() ?? booking.quotedPrice?.toNumber() ?? null;
        if (expectedTotal === null || Math.abs(quote.total.toNumber() - expectedTotal) > 0.001) {
          fail(409, "Ask the provider for a quotation that matches the current booking price");
        }
        if (Math.abs(expectedTotal - data.totalAmount) > 0.001) fail(400, "Signed amount does not match the booking total");
        if (!quote.terms?.trim()) fail(409, "Ask the provider to add terms to the quotation before signing");
        if (data.terms !== quote.terms) fail(409, "Quotation terms have changed. Reload the agreement before signing.");
        const deposit = booking.depositAmount?.toNumber() ?? quote.depositRequired?.toNumber() ?? 0;
        if (deposit < 0 || deposit > expectedTotal) fail(409, "Ask the provider to correct the quotation deposit");
        if (Math.abs((data.depositAmount ?? 0) - deposit) > 0.001) fail(409, "The deposit has changed. Reload the agreement before signing.");

        const forwarded = req.headers["x-forwarded-for"];
        const ipAddress = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim() || req.ip || null;
        const saved = await tx.agreement.create({
          data: {
            bookingId: booking.id, documentId: quote.id,
            customerName: data.customerName, customerPhone: data.customerPhone,
            customerEmail: data.customerEmail, customerAddress: data.customerAddress || null,
            signature: data.signature, terms: quote.terms, totalAmount: expectedTotal,
            depositAmount: deposit, ipAddress,
          },
        });
        await tx.document.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
        return saved;
      }, { isolationLevel: "Serializable" });

      sendNotice(data.customerEmail, data.customerName, {
        type: "Agreement", number: agreement.id.slice(-8).toUpperCase(),
        url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/dashboard/bookings/${data.bookingId}`,
      }).catch((error) => console.error("Agreement notification failed:", error));
      return res.status(201).json({ agreement });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Check your details and select a quotation before signing" });
      const failure = error as { status?: number; code?: string; message?: string };
      if (failure.status) return res.status(failure.status).json({ error: failure.message });
      if (failure.code === "P2034") return res.status(409).json({ error: "The booking changed. Reload the agreement before signing." });
      return res.status(500).json({ error: "Failed to create agreement" });
    }
  });

  return router;
}

export default createAgreementsRouter();
