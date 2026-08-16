import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { createNotification } from "../../lib/booking-engine";

const updateSchema = z.object({
  status: z.enum([
    "DRAFT", "SENT", "ACCEPTED", "REJECTED", "PAID", "OVERDUE", "CANCELLED",
  ]).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  depositPaid: z.boolean().optional(),
  paidAt: z.string().datetime().optional(),
});

const router = Router({ mergeParams: true });

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const id = (req.params as { id: string }).id;

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          event: { select: { title: true, eventDate: true } },
          provider: { select: { businessName: true } },
          customer: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        },
      },
    },
  });

  if (!document) return res.status(404).json({ error: "Not found" });

  if (session.role === "PROVIDER" && document.senderId !== session.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (session.role === "CUSTOMER" && document.recipientId !== session.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return res.status(200).json({ document });
});

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const id = (req.params as { id: string }).id;

  try {
    const data = updateSchema.parse(req.body);

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (session.role === "PROVIDER" && existing.senderId !== session.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    if (session.role === "CUSTOMER" && existing.recipientId !== session.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.status === "PAID") {
      updateData.paidAt = data.paidAt ? new Date(data.paidAt) : new Date();
    }

    const updated = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    if (data.status === "SENT" && existing.recipientId) {
      await createNotification(
        existing.recipientId,
        "BOOKING",
        `${existing.type === "QUOTE" ? "Quote" : "Invoice"} Sent`,
        `A ${existing.type.toLowerCase()} has been sent to you`,
        session.role === "PROVIDER"
          ? `/dashboard/documents/${id}`
          : `/provider/documents/${id}`
      );
    }

    return res.status(200).json({ document: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to update document" });
  }
});

router.delete("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  const id = (req.params as { id: string }).id;

  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "Not found" });

  if (existing.status !== "DRAFT") {
    return res.status(400).json({ error: "Only draft documents can be deleted" });
  }

  if (session.role === "PROVIDER" && existing.senderId !== session.id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await prisma.document.delete({ where: { id } });
  return res.status(200).json({ success: true });
});

export default router;
