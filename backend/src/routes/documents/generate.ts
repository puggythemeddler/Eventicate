import { Router } from "express";
import { getSession } from "../../lib/auth";
import prisma from "../../lib/prisma";
import { generateQuoteFromBooking, generateInvoiceFromBooking, generateProformaInvoice, generateTaxInvoice } from "../../lib/documents";
import { sendDocumentNotification } from "../../lib/email";

const router = Router();

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (session.role !== "PROVIDER" && session.role !== "ADMIN") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const type = req.query.type as string | undefined;
  const bookingId = req.query.bookingId as string | undefined;

  if (!type || !["quote", "invoice", "proforma", "tax-invoice"].includes(type)) {
    return res.status(400).json({ error: "Invalid type. Use 'quote', 'invoice', 'proforma', or 'tax-invoice'" });
  }
  if (!bookingId) {
    return res.status(400).json({ error: "bookingId is required" });
  }

  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { providerId: true },
    });
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (session.role === "PROVIDER") {
      const provider = await prisma.providerProfile.findUnique({
        where: { userId: session.id },
        select: { id: true },
      });
      if (!provider || provider.id !== booking.providerId) {
        return res.status(403).json({ error: "You can only generate documents for your own bookings" });
      }
    }

    let document;
    if (type === "quote") {
      document = await generateQuoteFromBooking(bookingId);
    } else if (type === "invoice") {
      document = await generateInvoiceFromBooking(bookingId);
    } else if (type === "proforma") {
      document = await generateProformaInvoice(bookingId);
    } else {
      document = await generateTaxInvoice(bookingId);
    }

    const docType = type === "quote" ? "Quote" : type === "proforma" ? "Proforma Invoice" : type === "tax-invoice" ? "Tax Invoice" : "Invoice";
    sendDocumentNotification(document.recipientEmail, document.recipientName, {
      type: docType,
      number: document.documentNumber,
      url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/documents/${document.id}`,
    }).catch((e) => console.error("Document notification email failed:", e));

    return res.status(201).json({ document });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate document";
    return res.status(500).json({ error: message });
  }
});

export default router;
