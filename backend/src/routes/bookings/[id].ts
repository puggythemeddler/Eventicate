import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { blockAvailability, releaseAvailability, createNotification } from "../../lib/booking-engine";
import { generateQuoteFromBooking } from "../../lib/documents";
import { sendBookingStatusUpdate } from "../../lib/email";

const updateSchema = z.object({
  status: z.enum([
    "QUOTATION_SENT", "PENDING_APPROVAL", "CONFIRMED",
    "DEPOSIT_PAID", "COMPLETED", "CANCELLED", "REJECTED",
  ]).optional(),
  quotedPrice: z.number().optional(),
  finalPrice: z.number().optional(),
  depositAmount: z.number().optional(),
  providerNotes: z.string().optional(),
  quotationDetails: z.string().optional(),
});

// Provider-allowed transitions. Money states (DEPOSIT_PAID) can only ever be
// reached through a verified payment in the payments flow — never via this PATCH.
const PROVIDER_TRANSITIONS: Record<string, string[]> = {
  QUOTATION_REQUESTED: ["QUOTATION_SENT", "REJECTED", "CANCELLED"],
  QUOTATION_SENT: ["PENDING_APPROVAL", "REJECTED", "CANCELLED"],
  PENDING_APPROVAL: ["CONFIRMED", "REJECTED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  DEPOSIT_PAID: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

// Customer-allowed transitions: accept/reject a quotation, cancel own confirmed booking.
const CUSTOMER_TRANSITIONS: Record<string, string[]> = {
  QUOTATION_SENT: ["CONFIRMED", "REJECTED"],
  PENDING_APPROVAL: ["CONFIRMED", "REJECTED"],
  CONFIRMED: ["CANCELLED"],
};


function assertTransition(allowed: Record<string, string[]>, from: string, to: string): string | null {
  if (!allowed[from]) return `Booking in status ${from} cannot be changed`;
  if (!allowed[from].includes(to)) return `Cannot change status from ${from} to ${to}`;
  return null;
}

export function createBookingDetailRouter(sendStatus: typeof sendBookingStatusUpdate = sendBookingStatusUpdate) {
  const router = Router({ mergeParams: true });
  router.patch("/", async (req, res) => {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const id = (req.params as { id: string }).id;

    try {
      const data = updateSchema.parse(req.body);

      const booking = await prisma.booking.findUnique({
        where: { id },
        include: {
          event: true,
          provider: { include: { user: true } },
          customer: { include: { user: true } },
        },
      });
      if (!booking) return res.status(404).json({ error: "Booking not found" });

      // Role-based ownership: only the booking's provider or customer may update it.
      let actorProfileId: string | null = null;
      if (session.role === "PROVIDER") {
        const provider = await prisma.providerProfile.findUnique({ where: { userId: session.id } });
        if (!provider || booking.providerId !== provider.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
        actorProfileId = provider.id;
      } else if (session.role === "CUSTOMER") {
        const customer = await prisma.customerProfile.findUnique({ where: { userId: session.id } });
        if (!customer || booking.customerId !== customer.id) {
          return res.status(403).json({ error: "Forbidden" });
        }
        actorProfileId = customer.id;
      } else {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Customers may only change status — never prices or notes.
      if (session.role === "CUSTOMER") {
        const allowedFields = ["status"];
        const attempted = Object.keys(data);
        if (attempted.some((k) => !allowedFields.includes(k))) {
          return res.status(400).json({ error: "Customers may only update booking status" });
        }
      }

      // Enforce a valid state transition.
      if (data.status) {
        const roleTransitions = session.role === "PROVIDER" ? PROVIDER_TRANSITIONS : CUSTOMER_TRANSITIONS;
        const transitionError = assertTransition(roleTransitions, booking.status, data.status);
        if (transitionError) {
          return res.status(400).json({ error: transitionError });
        }
        // Providers may never set a money state via this endpoint — a booking can
        // only become DEPOSIT_PAID through a verified payment record.
        if (session.role === "PROVIDER" && data.status === "DEPOSIT_PAID") {
          return res.status(403).json({ error: "Deposit paid status can only be set once payment is verified" });
        }
        // COMPLETED requires a confirmed or deposit-paid booking.
        if (session.role === "PROVIDER" && data.status === "COMPLETED" &&
            booking.status !== "CONFIRMED" && booking.status !== "DEPOSIT_PAID") {
          return res.status(400).json({ error: "Booking must be confirmed before it can be completed" });
        }
      }

      // Price fields are provider-owned.
      if (data.quotedPrice !== undefined && data.quotedPrice < 0) {
        return res.status(400).json({ error: "Price cannot be negative" });
      }

      if (data.status === "QUOTATION_SENT") {
        const price = data.quotedPrice ?? 0;
        const deposit = data.depositAmount ?? Number(booking.depositAmount ?? 0);
        if (price <= 0 || !data.providerNotes?.trim()) {
          return res.status(400).json({ error: "A positive price and quotation terms are required" });
        }
        if (deposit < 0 || deposit > price) {
          return res.status(400).json({ error: "Deposit must be between zero and the quoted price" });
        }
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: {
          ...data,
          // depositPaid is only ever set true by the verified payments flow — this
          // endpoint only clears it when a booking is cancelled or rejected.
          depositPaid:
            data.status === "CANCELLED" || data.status === "REJECTED" ? false : undefined,
        },
        include: { event: true, provider: true, service: true },
      });

      if (data.status === "CONFIRMED" || data.status === "DEPOSIT_PAID") {
        await blockAvailability(booking.providerId, booking.event.eventDate, id, "CONFIRMED");
      }

      if (data.status === "CANCELLED" || data.status === "REJECTED") {
        await releaseAvailability(booking.providerId, booking.event.eventDate);
      }

      if (data.status === "QUOTATION_SENT" && data.quotedPrice) {
        await generateQuoteFromBooking(id);
      }

      if (data.status) {
        const customerUser = booking.customer.user;
        sendStatus(customerUser.email, customerUser.firstName, {
          id,
          eventName: booking.event.title,
          status: data.status,
        }).catch((e) => console.error("Booking status update email failed:", e));
      }

      const notifyUserId =
        session.role === "PROVIDER"
          ? booking.customer.userId
          : booking.provider.userId;

      await createNotification(
        notifyUserId,
        "BOOKING",
        "Booking Updated",
        `Booking status changed to ${data.status?.replace(/_/g, " ").toLowerCase()}`,
        session.role === "PROVIDER"
          ? `/dashboard/bookings/${id}`
          : `/provider/bookings/${id}`
      );

      return res.status(200).json({ booking: updated });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      return res.status(500).json({ error: "Failed to update booking" });
    }
  });

  router.get("/", async (req, res) => {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: "Unauthorized" });

    const id = (req.params as { id: string }).id;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        event: true,
        items: {
          include: { equipment: true, service: true },
        },
        provider: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        customer: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        service: true,
        payments: { orderBy: { createdAt: "desc" } },
        documents: {
          where: { type: "QUOTE", status: { notIn: ["CANCELLED", "REJECTED"] } },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { id: true, type: true, documentNumber: true, total: true, depositRequired: true, terms: true, lineItems: true },
        },
        agreements: {
          orderBy: { signedAt: "desc" },
          select: { id: true, documentId: true, customerName: true, signedAt: true, totalAmount: true, depositAmount: true, terms: true },
        },
        reviews: true,
        messages: {
          include: {
            sender: { select: { firstName: true, lastName: true, role: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!booking) return res.status(404).json({ error: "Not found" });

    if (session.role === "PROVIDER") {
      const provider = await prisma.providerProfile.findUnique({
        where: { userId: session.id },
      });
      if (!provider || booking.providerId !== provider.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    } else if (session.role === "CUSTOMER") {
      const customer = await prisma.customerProfile.findUnique({
        where: { userId: session.id },
      });
      if (!customer || booking.customerId !== customer.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    return res.status(200).json({ booking });
  });

  return router;
}

export default createBookingDetailRouter();
