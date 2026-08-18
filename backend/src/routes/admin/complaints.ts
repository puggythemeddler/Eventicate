import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";

const router = Router();

router.get("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const status = req.query.status as string | undefined;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;

  const complaints = await prisma.complaint.findMany({
    where,
    include: {
      reporter: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const bookingIds = [...new Set(complaints.map((c) => c.bookingId).filter(Boolean))] as string[];
  const bookings = bookingIds.length
    ? await prisma.booking.findMany({
        where: { id: { in: bookingIds } },
        select: {
          id: true,
          status: true,
          finalPrice: true,
          provider: { select: { businessName: true } },
          customer: { select: { user: { select: { firstName: true, lastName: true } } } },
        },
      })
    : [];
  const bookingMap = new Map(bookings.map((b) => [b.id, b]));

  const enriched = complaints.map((c) => ({
    ...c,
    booking: c.bookingId ? bookingMap.get(c.bookingId) ?? null : null,
  }));

  return res.status(200).json({ complaints: enriched });
});

const patchSchema = z.object({
  complaintId: z.string(),
  status: z.enum(["open", "investigating", "resolved", "dismissed"]).optional(),
  adminNotes: z.string().optional(),
  resolution: z.enum(["REFUNDED", "PARTIAL_REFUND", "NO_REFUND"]).optional(),
  refundAmount: z.number().min(0).optional(),
});

router.patch("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized" });
  }

  try {
    const body = req.body;
    const data = patchSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.adminNotes !== undefined) updateData.adminNotes = data.adminNotes;
    if (data.resolution !== undefined) updateData.resolution = data.resolution;
    if (data.refundAmount !== undefined) updateData.refundAmount = data.refundAmount;
    if (data.status === "resolved") updateData.resolvedAt = new Date();
    if (data.status && data.status !== "resolved") {
      updateData.resolvedAt = null;
      if (data.status === "open") {
        updateData.resolution = null;
        updateData.refundAmount = null;
      }
    }

    const complaint = await prisma.complaint.update({
      where: { id: data.complaintId },
      data: updateData,
    });

    // Notify the reporter about the outcome.
    if (data.status === "resolved" || data.status === "dismissed") {
      const message =
        data.status === "resolved"
          ? data.resolution && data.resolution !== "NO_REFUND"
            ? `Your complaint was resolved${data.refundAmount ? ` and a refund of ${data.refundAmount} was issued` : ""}.`
            : "Your complaint was resolved."
          : "Your complaint was reviewed and dismissed.";
      await prisma.notification.create({
        data: {
          userId: complaint.reporterId,
          type: "SYSTEM",
          title: "Complaint Update",
          message,
          link: "/dashboard/complaints",
        },
      });
    }

    return res.status(200).json({ complaint });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Complaint PATCH error:", error);
    return res.status(500).json({ error: "Failed to update complaint" });
  }
});

export default router;
