import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { generateQuoteFromBooking, generateInvoiceFromBooking, generateProformaInvoice, generateTaxInvoice } from "@/lib/documents";
import { sendDocumentNotification } from "@/lib/email";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "PROVIDER" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const bookingId = searchParams.get("bookingId");

  if (!type || !["quote", "invoice", "proforma", "tax-invoice"].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Use 'quote', 'invoice', 'proforma', or 'tax-invoice'" }, { status: 400 });
  }
  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required" }, { status: 400 });
  }

  try {
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

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
