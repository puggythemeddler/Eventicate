import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { cancelBooking, cancellationError as fail } from "../../lib/cancellations";

const schema = z.object({
  complaintId: z.string().min(1),
  status: z.enum(["open", "investigating", "refund_pending", "resolved", "dismissed"]).optional(),
  adminNotes: z.string().max(5000).optional(),
  resolution: z.enum(["REFUNDED", "PARTIAL_REFUND", "NO_REFUND"]).optional(),
  refundAmount: z.number().nonnegative().multipleOf(0.01).optional(),
  refundReference: z.string().trim().min(3).max(200).optional(),
});

export function createComplaintResolutionRouter() {
  const router = Router();
  router.patch("/", async (req, res) => {
    const session = await getSession(req);
    if (!session || session.role !== "ADMIN") return res.status(403).json({ error: "Unauthorized" });
    try {
      const data = schema.parse(req.body);
      const complaint = await prisma.$transaction(async tx => {
        const current = await tx.complaint.findUnique({ where: { id: data.complaintId } });
        if (!current) fail(404, "Complaint not found");
        const nextStatus = data.status ?? current.status;
        const changingOutcome = data.status !== undefined || data.resolution !== undefined || data.refundAmount !== undefined || data.refundReference !== undefined;
        if (["resolved", "dismissed"].includes(current.status) && changingOutcome) {
          fail(409, "This decision is final. Its payment record cannot be changed or reopened.");
        }
        if (!data.status && (data.resolution !== undefined || data.refundAmount !== undefined || data.refundReference !== undefined)) fail(400, "Select a decision status");
        const resolution = data.resolution ?? current.resolution;
        const amount = new Prisma.Decimal(data.refundAmount ?? current.refundAmount ?? 0);
        const hasRefund = resolution === "REFUNDED" || resolution === "PARTIAL_REFUND";
        const booking = current.bookingId ? await tx.booking.findUnique({ where: { id: current.bookingId }, include: { payments: true, provider: true, customer: true } }) : null;
        const update: Prisma.ComplaintUpdateInput = { adminNotes: data.adminNotes };

        if (changingOutcome) {
          if (current.status === "refund_pending") {
            if (nextStatus !== "resolved") fail(409, "Record the approved refund before closing this request");
            if (resolution !== current.resolution || !amount.equals(current.refundAmount ?? 0)) fail(409, "The approved refund decision and amount cannot change at payout");
          }
          if (nextStatus === "refund_pending" || (nextStatus === "resolved" && hasRefund)) {
            if (!booking || !hasRefund || !amount.greaterThan(0)) fail(400, "A refund requires a booking, a refund decision and a positive amount");
            const settled = booking.payments.filter(p => ["DEPOSIT_PAID", "FULLY_PAID"].includes(p.status)).reduce((total, p) => total.plus(p.amount), new Prisma.Decimal(0));
            const other = await tx.complaint.findMany({ where: { bookingId: booking.id, id: { not: current.id }, status: { in: ["refund_pending", "resolved"] }, resolution: { in: ["REFUNDED", "PARTIAL_REFUND"] } } });
            const reserved = other.reduce((total, c) => total.plus(c.refundAmount ?? 0), new Prisma.Decimal(0));
            const available = settled.minus(reserved);
            if (amount.greaterThan(available)) fail(400, "Refund exceeds settled payments remaining after other approved refunds");
            if (resolution === "REFUNDED" && !amount.equals(available)) fail(400, "A full refund must equal the remaining refundable amount");
            if (nextStatus === "resolved") {
              if (current.status !== "refund_pending") fail(409, "Approve the refund as pending before recording returned funds");
              if (data.refundAmount !== undefined && !amount.equals(current.refundAmount ?? 0)) fail(409, "The approved refund amount cannot change at payout");
              if (data.resolution && data.resolution !== current.resolution) fail(409, "The approved refund decision cannot change at payout");
              if (!data.refundReference) fail(400, "Enter the reference for the completed refund transfer");
              update.refundReference = data.refundReference;
              update.refundPaidAt = new Date();
              update.refundRecordedBy = session.id;
            } else if (data.refundReference) fail(400, "A transfer reference is recorded only after funds have been returned");
            update.resolution = resolution;
            update.refundAmount = amount;
          } else {
            if (data.refundReference || (data.refundAmount ?? 0) > 0 || (data.resolution && data.resolution !== "NO_REFUND")) fail(400, "Refund decisions must use Refund pending");
            update.resolution = nextStatus === "resolved" ? "NO_REFUND" : null;
            update.refundAmount = null;
          }
          if (current.complaintType === "cancellation_request" && ["refund_pending", "resolved"].includes(nextStatus)) {
            if (!booking) fail(404, "Booking not found");
            if (!["CONFIRMED", "DEPOSIT_PAID", "CANCELLED"].includes(booking.status)) fail(409, "This booking can no longer be cancelled through this request");
            if (!data.adminNotes?.trim() && !current.adminNotes?.trim()) fail(400, "Add the reason for the cancellation and refund decision");
            if (booking.status !== "CANCELLED") await cancelBooking(tx, booking.id);
          }
          update.status = nextStatus;
          update.resolvedAt = ["resolved", "dismissed"].includes(nextStatus) ? new Date() : null;
        }
        const saved = await tx.complaint.update({ where: { id: current.id }, data: update });
        if (changingOutcome && nextStatus !== current.status) {
          const message = nextStatus === "refund_pending" ? "Your request was approved. The refund is pending; no transfer has been recorded yet."
            : nextStatus === "resolved" && hasRefund ? "The administrator recorded the refund transfer and its reference."
            : nextStatus === "resolved" ? "Your request was resolved without a refund. See the decision notes."
            : nextStatus === "dismissed" ? "Your request was declined. See the decision notes." : "Your request is under review.";
          for (const userId of new Set([current.reporterId, booking?.customer.userId, booking?.provider.userId].filter((id): id is string => Boolean(id)))) {
            await tx.notification.create({ data: { userId, type: "SYSTEM", title: "Request update", message, link: "/dashboard/complaints" } });
          }
        }
        return saved;
      }, { isolationLevel: "Serializable" });
      return res.json({ complaint });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Check the decision, amount and transfer reference" });
      const failure = error as { status?: number; message?: string; code?: string };
      if (failure.status) return res.status(failure.status).json({ error: failure.message });
      if (failure.code === "P2034") return res.status(409).json({ error: "A payment or request changed. Reload before deciding." });
      return res.status(500).json({ error: "Could not update the request" });
    }
  });
  return router;
}

export default createComplaintResolutionRouter();
