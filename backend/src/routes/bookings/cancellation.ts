import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { cancellationError as fail } from "../../lib/cancellations";

export function createCancellationRouter() {
  const router = Router({ mergeParams: true });
  router.post("/", async (req, res) => {
    const session = await getSession(req);
    if (!session || !["CUSTOMER", "PROVIDER"].includes(session.role)) return res.status(403).json({ error: "Unauthorized" });
    try {
      const { reason } = z.object({ reason: z.string().trim().min(10).max(2000) }).parse(req.body);
      const bookingId = (req.params as { id: string }).id;
      const complaint = await prisma.$transaction(async tx => {
        const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { customer: true, provider: true } });
        if (!booking) fail(404, "Booking not found");
        const ownUserId = session.role === "CUSTOMER" ? booking.customer.userId : booking.provider.userId;
        if (ownUserId !== session.id) fail(403, "You can only request cancellation for your own booking");
        if (!["CONFIRMED", "DEPOSIT_PAID"].includes(booking.status)) fail(409, "This booking is not open for a cancellation request");
        const existing = await tx.complaint.findFirst({ where: { bookingId, complaintType: "cancellation_request", status: { in: ["open", "investigating"] } } });
        if (existing) return existing;
        const saved = await tx.complaint.create({ data: {
          reporterId: session.id, reportedId: session.role === "CUSTOMER" ? booking.provider.userId : booking.customer.userId,
          bookingId, complaintType: "cancellation_request", subject: "Booking cancellation request", description: reason,
        } });
        const admins = await tx.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
        const recipients = new Set([...admins.map(a => a.id), booking.provider.userId, booking.customer.userId]);
        for (const userId of recipients) await tx.notification.create({ data: {
          userId, type: "BOOKING", title: "Cancellation requested",
          message: "A cancellation request is awaiting admin review. The booking remains active until a decision is recorded.",
          link: admins.some(a => a.id === userId) ? "/admin/complaints" : userId === booking.customer.userId ? `/dashboard/bookings/${bookingId}` : `/provider/bookings/${bookingId}`,
        } });
        return saved;
      }, { isolationLevel: "Serializable" });
      return res.status(201).json({ complaint });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: "Enter a cancellation reason of 10–2000 characters" });
      const failure = error as { status?: number; message?: string; code?: string };
      if (failure.status) return res.status(failure.status).json({ error: failure.message });
      if (["P2034", "P2002"].includes(failure.code || "")) return res.status(409).json({ error: "The booking changed. Reload and try again." });
      return res.status(500).json({ error: "Could not request cancellation" });
    }
  });
  return router;
}

export default createCancellationRouter();
