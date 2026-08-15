import prisma from "./prisma";

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export function formatDocumentNumber(num: number): string {
  return String(num).padStart(4, "0");
}

export async function generateDocumentNumber(type: "QUOTE" | "INVOICE" | "RECEIPT" | "PROFORMA_INVOICE" | "TAX_INVOICE"): Promise<string> {
  const prefix = type === "QUOTE" ? "QTE" : type === "INVOICE" ? "INV" : type === "PROFORMA_INVOICE" ? "PFI" : type === "TAX_INVOICE" ? "TIN" : "RCT";
  const lastDoc = await prisma.document.findFirst({
    where: { type },
    orderBy: { createdAt: "desc" },
    select: { documentNumber: true },
  });
  let nextNum = 1;
  if (lastDoc) {
    const parts = lastDoc.documentNumber.split("-");
    const lastNum = parseInt(parts[1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }
  return `${prefix}-${formatDocumentNumber(nextNum)}`;
}

export function calculateDocumentTotals(
  lineItems: LineItem[],
  taxRate: number,
  discountRate: number
): { subtotal: number; taxAmount: number; discountAmount: number; total: number } {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discountRate / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    taxAmount: Math.round(taxAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export async function generateQuoteFromBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      event: true,
      provider: { include: { user: true } },
      customer: { include: { user: true } },
      service: true,
    },
  });
  if (!booking || !booking.quotedPrice) throw new Error("Booking not found or no quoted price");

  const lineItems: LineItem[] = [
    {
      description: booking.service?.name || "Event Service",
      quantity: 1,
      unitPrice: booking.quotedPrice,
      total: booking.quotedPrice,
    },
  ];
  const depositRequired = booking.depositAmount || booking.quotedPrice * 0.3;
  const totals = calculateDocumentTotals(lineItems, 0, 0);

  const docNumber = await generateDocumentNumber("QUOTE");

  return prisma.document.create({
    data: {
      type: "QUOTE",
      status: "DRAFT",
      documentNumber: docNumber,
      bookingId: booking.id,
      senderId: booking.provider.userId,
      senderName: booking.provider.businessName,
      recipientId: booking.customer.userId,
      recipientName: `${booking.customer.user.firstName} ${booking.customer.user.lastName}`,
      recipientEmail: booking.customer.user.email,
      lineItems: JSON.stringify(lineItems),
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      depositRequired,
      depositPaid: booking.depositPaid,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      notes: `Quote for ${booking.event.title} on ${booking.event.eventDate.toLocaleDateString()}`,
      terms: "Payment is due within 30 days. A deposit may be required to confirm the booking.",
    },
  });
}

export async function generateInvoiceFromBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      event: true,
      provider: { include: { user: true } },
      customer: { include: { user: true } },
      service: true,
      payments: true,
    },
  });
  if (!booking) throw new Error("Booking not found");

  const totalPaid = booking.payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = (booking.finalPrice || booking.quotedPrice || 0) - totalPaid;

  const lineItems: LineItem[] = [
    {
      description: booking.service?.name || "Event Service",
      quantity: 1,
      unitPrice: remaining > 0 ? (booking.finalPrice || booking.quotedPrice || 0) : totalPaid,
      total: remaining > 0 ? (booking.finalPrice || booking.quotedPrice || 0) : totalPaid,
    },
  ];
  const totals = calculateDocumentTotals(lineItems, 0, 0);
  const docNumber = await generateDocumentNumber("INVOICE");

  return prisma.document.create({
    data: {
      type: "INVOICE",
      status: remaining <= 0 ? "PAID" : "SENT",
      documentNumber: docNumber,
      bookingId: booking.id,
      senderId: booking.provider.userId,
      senderName: booking.provider.businessName,
      recipientId: booking.customer.userId,
      recipientName: `${booking.customer.user.firstName} ${booking.customer.user.lastName}`,
      recipientEmail: booking.customer.user.email,
      lineItems: JSON.stringify(lineItems),
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      depositRequired: booking.depositAmount,
      depositPaid: booking.depositPaid,
      notes: `Invoice for ${booking.event.title}`,
      terms: "Payment is due upon receipt.",
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      issuedAt: new Date(),
      paidAt: remaining <= 0 ? new Date() : null,
    },
  });
}

export async function generateProformaInvoice(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      event: true,
      provider: { include: { user: true } },
      customer: { include: { user: true } },
      service: true,
      payments: true,
    },
  });
  if (!booking) throw new Error("Booking not found");

  const totalPaid = booking.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDue = booking.finalPrice || booking.quotedPrice || 0;
  const remaining = totalDue - totalPaid;

  const lineItems: LineItem[] = [
    {
      description: booking.service?.name || "Event Service",
      quantity: 1,
      unitPrice: totalDue,
      total: totalDue,
    },
  ];
  const totals = calculateDocumentTotals(lineItems, 0, 0);
  const docNumber = await generateDocumentNumber("PROFORMA_INVOICE");

  return prisma.document.create({
    data: {
      type: "PROFORMA_INVOICE",
      status: "DRAFT",
      documentNumber: docNumber,
      bookingId: booking.id,
      senderId: booking.provider.userId,
      senderName: booking.provider.businessName,
      recipientId: booking.customer.userId,
      recipientName: `${booking.customer.user.firstName} ${booking.customer.user.lastName}`,
      recipientEmail: booking.customer.user.email,
      lineItems: JSON.stringify(lineItems),
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      depositRequired: booking.depositAmount,
      depositPaid: booking.depositPaid,
      notes: remaining > 0
        ? `Deposit of ${booking.depositAmount ? `$${booking.depositAmount.toFixed(2)} ` : ""}required. Balance of $${remaining.toFixed(2)} due by the event date.`
        : "Fully paid.",
      terms: "This is a proforma invoice — not a tax invoice. A deposit is required to confirm the booking.",
      validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      dueAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      issuedAt: new Date(),
    },
  });
}

export async function generateTaxInvoice(bookingId: string, taxRate = 16) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      event: true,
      provider: { include: { user: true } },
      customer: { include: { user: true } },
      service: true,
      payments: true,
    },
  });
  if (!booking) throw new Error("Booking not found");

  const totalPaid = booking.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalDue = booking.finalPrice || booking.quotedPrice || 0;

  const lineItems: LineItem[] = [
    {
      description: booking.service?.name || "Event Service",
      quantity: 1,
      unitPrice: totalDue,
      total: totalDue,
    },
  ];
  const totals = calculateDocumentTotals(lineItems, taxRate, 0);
  const docNumber = await generateDocumentNumber("TAX_INVOICE");

  return prisma.document.create({
    data: {
      type: "TAX_INVOICE",
      status: totalPaid >= totalDue ? "PAID" : "SENT",
      documentNumber: docNumber,
      bookingId: booking.id,
      senderId: booking.provider.userId,
      senderName: booking.provider.businessName,
      recipientId: booking.customer.userId,
      recipientName: `${booking.customer.user.firstName} ${booking.customer.user.lastName}`,
      recipientEmail: booking.customer.user.email,
      lineItems: JSON.stringify(lineItems),
      subtotal: totals.subtotal,
      taxRate,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      depositRequired: booking.depositAmount,
      depositPaid: booking.depositPaid,
      notes: `Tax Invoice (VAT ${taxRate}%) for ${booking.event.title}. ${booking.depositPaid ? `Deposit of $${(booking.depositAmount || 0).toFixed(2)} paid.` : ""}`,
      terms: "Payment is due within 30 days. This is a valid tax invoice for VAT purposes.",
      dueAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      issuedAt: new Date(),
      paidAt: totalPaid >= totalDue ? new Date() : null,
    },
  });
}

export async function generateReceiptFromPayment(
  booking: {
    id: string;
    provider: { userId: string; businessName: string };
    customer: { userId: string; user: { firstName: string; lastName: string; email: string } };
    depositPaid: boolean;
    depositAmount?: number | null;
    event?: { title: string } | null;
  },
  payment: { amount: number; method: string; isDeposit: boolean; paidAt: Date | null },
  eventTitle?: string
) {
  const lineItems: LineItem[] = [
    {
      description: payment.isDeposit ? "Deposit Payment" : "Full Payment",
      quantity: 1,
      unitPrice: payment.amount,
      total: payment.amount,
    },
  ];
  const totals = calculateDocumentTotals(lineItems, 0, 0);
  const docNumber = await generateDocumentNumber("RECEIPT");

  return prisma.document.create({
    data: {
      type: "RECEIPT",
      status: "PAID",
      documentNumber: docNumber,
      bookingId: booking.id,
      senderId: booking.provider.userId,
      senderName: booking.provider.businessName,
      recipientId: booking.customer.userId,
      recipientName: `${booking.customer.user.firstName} ${booking.customer.user.lastName}`,
      recipientEmail: booking.customer.user.email,
      lineItems: JSON.stringify(lineItems),
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      discountAmount: totals.discountAmount,
      total: totals.total,
      depositPaid: booking.depositPaid,
      notes: `Receipt for ${payment.isDeposit ? "deposit on " : ""}${eventTitle || "booking"}`,
      issuedAt: new Date(),
      paidAt: payment.paidAt || new Date(),
    },
  });
}
