import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { createNotification } from "../lib/booking-engine";

const router = Router();

const createSchema = z.object({
  subject: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  complaintType: z
    .enum(["service_quality", "no_show", "damaged_items", "payment_refund", "other"])
    .default("other"),
  priority: z.enum(["normal", "high", "urgent"]).default("normal"),
  evidenceUrls: z.array(z.string().url()).max(10).default([]),
  bookingId: z.string().optional(),
  reportedId: z.string().optional(),
});

// Create a complaint/dispute. Available to customers and providers.
router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session || (session.role !== "CUSTOMER" && session.role !== "PROVIDER")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const data = createSchema.parse(req.body);

    if (data.bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: data.bookingId },
        select: { id: true, customerId: true, providerId: true },
      });
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }
      const ownsBooking =
        (session.role === "CUSTOMER" &&
          (await prisma.customerProfile.count({ where: { userId: session.id, id: booking.customerId } })) > 0) ||
        (session.role === "PROVIDER" &&
          (await prisma.providerProfile.count({
            where: { userId: session.id, id: booking.providerId },
          })) > 0);
      if (!ownsBooking) {
        return res.status(403).json({ error: "You can only file a complaint about your own bookings" });
      }
    }

    const complaint = await prisma.complaint.create({
      data: {
        reporterId: session.id,
        reportedId: data.reportedId,
        bookingId: data.bookingId,
        subject: data.subject,
        description: data.description,
        complaintType: data.complaintType,
        priority: data.priority,
        evidenceUrls: JSON.stringify(data.evidenceUrls),
      },
    });

    // Notify admins so disputes don't sit unanswered.
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    await Promise.all(
      admins.map((a) =>
        createNotification(
          a.id,
          "SYSTEM",
          "New Complaint",
          `Complaint "${data.subject}" was filed`,
          "/admin/complaints"
        )
      )
    );

    return res.status(201).json({ complaint });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Complaint create error:", error);
    return res.status(500).json({ error: "Failed to file complaint" });
  }
});

// List the current user's own complaints.
router.get("/my", async (req, res) => {
  const session = await getSession(req);
  if (!session || (session.role !== "CUSTOMER" && session.role !== "PROVIDER")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const complaints = await prisma.complaint.findMany({
    where: { OR: [{ reporterId: session.id }, { reportedId: session.id }] },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({ complaints });
});

export default router;
