import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { getSession } from "../lib/auth";
import { createNotification } from "../lib/booking-engine";
import { calculateAverageRating } from "../lib/utils";

const reviewSchema = z.object({
  bookingId: z.string(),
  comment: z.string().optional(),
  serviceQuality: z.number().min(1).max(5).optional(),
  professionalism: z.number().min(1).max(5).optional(),
  equipmentQuality: z.number().min(1).max(5).optional(),
  communication: z.number().min(1).max(5).optional(),
  reliability: z.number().min(1).max(5).optional(),
  paymentReliability: z.number().min(1).max(5).optional(),
  customerCommunication: z.number().min(1).max(5).optional(),
  respectForAgreements: z.number().min(1).max(5).optional(),
  eventOrganization: z.number().min(1).max(5).optional(),
});

const router = Router();

router.post("/", async (req, res) => {
  const session = await getSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });

  try {
    const body = req.body;
    const data = reviewSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        provider: { include: { user: true } },
        customer: { include: { user: true } },
      },
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status !== "COMPLETED") {
      return res.status(400).json({ error: "Can only review completed bookings" });
    }

    const isCustomerReview = session.role === "CUSTOMER";

    const review = await prisma.review.create({
      data: {
        bookingId: data.bookingId,
        reviewerId: session.id,
        revieweeId: isCustomerReview ? booking.provider.userId : booking.customer.userId,
        reviewerRole: session.role,
        isPublic: isCustomerReview,
        comment: data.comment,
        ...(isCustomerReview
          ? {
              serviceQuality: data.serviceQuality,
              professionalism: data.professionalism,
              equipmentQuality: data.equipmentQuality,
              communication: data.communication,
              reliability: data.reliability,
              providerId: booking.providerId,
              customerReviewerId: booking.customerId,
            }
          : {
              paymentReliability: data.paymentReliability,
              customerCommunication: data.customerCommunication,
              respectForAgreements: data.respectForAgreements,
              eventOrganization: data.eventOrganization,
              customerId: booking.customerId,
              providerReviewerId: booking.providerId,
            }),
      },
    });

    if (isCustomerReview) {
      const providerReviews = await prisma.review.findMany({
        where: { providerId: booking.providerId, isPublic: true },
      });
      const allAvgs = providerReviews.map((r) =>
        calculateAverageRating([
          r.serviceQuality, r.professionalism, r.equipmentQuality,
          r.communication, r.reliability,
        ])
      );
      const overallAvg = allAvgs.reduce((a, b) => a + b, 0) / allAvgs.length;

      await prisma.providerProfile.update({
        where: { id: booking.providerId },
        data: {
          averageRating: Math.round(overallAvg * 10) / 10,
          totalReviews: providerReviews.length,
        },
      });
    }

    await createNotification(
      isCustomerReview ? booking.provider.userId : booking.customer.userId,
      "REVIEW",
      "New Review",
      `You received a new review`,
      isCustomerReview ? `/provider/reviews` : `/dashboard/bookings`
    );

    return res.status(201).json({ review });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return res.status(500).json({ error: "Failed to submit review" });
  }
});

router.get("/", async (req, res) => {
  const providerId = req.query.providerId as string | undefined;

  const reviews = await prisma.review.findMany({
    where: {
      isPublic: true,
      ...(providerId ? { providerId } : {}),
    },
    include: {
      customerReviewer: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      booking: { select: { event: { select: { title: true, eventType: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({ reviews });
});

export default router;
