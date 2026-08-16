import { Router } from "express";
import { z } from "zod";
import prisma from "../../lib/prisma";
import { getSession } from "../../lib/auth";
import { blockAvailability, createNotification } from "../../lib/booking-engine";
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

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        ...data,
        depositPaid: data.status === "DEPOSIT_PAID" ? true : undefined,
      },
      include: { event: true, provider: true, service: true },
    });

    if (data.status === "CONFIRMED" || data.status === "DEPOSIT_PAID") {
      await blockAvailability(booking.providerId, booking.event.eventDate, id, "CONFIRMED");
    }

    if (data.status === "QUOTATION_SENT" && data.quotedPrice) {
      await generateQuoteFromBooking(id);
    }

    if (data.status) {
      const customerUser = booking.customer.user;
      sendBookingStatusUpdate(customerUser.email, customerUser.firstName, {
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

export default router;
