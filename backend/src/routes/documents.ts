import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { generateDocumentNumber, calculateDocumentTotals } from "../lib/documents";

const createSchema = z.object({
  type: z.enum(["QUOTE", "INVOICE", "RECEIPT"]),
  bookingId: z.string().optional(),
  recipientId: z.string(),
  recipientName: z.string(),
  recipientEmail: z.string().email(),
  recipientPhone: z.string().optional(),
  recipientAddress: z.string().optional(),
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    total: z.number().min(0),
  })),
  taxRate: z.number().min(0).max(100).default(0),
  discountRate: z.number().min(0).max(100).default(0),
  depositRequired: z.number().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  dueAt: z.string().datetime().optional(),
});

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;
  const bookingId = req.query.bookingId as string | undefined;

  const where: Record<string, unknown> = {};

  if (session.role === "PROVIDER") {
    where.senderId = session.id;
  } else if (session.role === "CUSTOMER") {
    where.recipientId = session.id;
  }
  if (type) where.type = type;
  if (status) where.status = status;
  if (bookingId) where.bookingId = bookingId;

  const documents = await prisma.document.findMany({
    where,
    include: {
      booking: {
        select: {
          id: true,
          event: { select: { title: true } },
          provider: { select: { businessName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({ documents });
});

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  if (session.role !== "PROVIDER" && session.role !== "ADMIN") {
    return res.status(403).json({ error: "Only providers can create documents" });
  }

  try {
    const data = createSchema.parse(req.body);

    const totals = calculateDocumentTotals(data.lineItems, data.taxRate, data.discountRate);
    const docNumber = await generateDocumentNumber(data.type);

    let senderName = "Platform Admin";
    if (session.role === "PROVIDER") {
      const provider = await prisma.providerProfile.findUnique({ where: { userId: session.id } });
      if (provider) senderName = provider.businessName;
    }

    const document = await prisma.document.create({
      data: {
        type: data.type,
        status: "DRAFT",
        documentNumber: docNumber,
        bookingId: data.bookingId,
        senderId: session.id,
        senderName,
        recipientId: data.recipientId,
        recipientName: data.recipientName,
        recipientEmail: data.recipientEmail,
        recipientPhone: data.recipientPhone,
        recipientAddress: data.recipientAddress,
        lineItems: JSON.stringify(data.lineItems),
        subtotal: totals.subtotal,
        taxRate: data.taxRate,
        taxAmount: totals.taxAmount,
        discountRate: data.discountRate,
        discountAmount: totals.discountAmount,
        total: totals.total,
        depositRequired: data.depositRequired,
        notes: data.notes,
        terms: data.terms,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        dueAt: data.dueAt ? new Date(data.dueAt) : null,
      },
    });

    return res.status(201).json({ document });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to create document" });
  }
});

export default router;
