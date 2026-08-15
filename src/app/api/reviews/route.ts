import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/booking-engine";
import { calculateAverageRating } from "@/lib/utils";

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

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = reviewSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        provider: { include: { user: true } },
        customer: { include: { user: true } },
      },
    });
    if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    if (booking.status !== "COMPLETED") {
      return NextResponse.json({ error: "Can only review completed bookings" }, { status: 400 });
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

    return NextResponse.json({ review }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const providerId = searchParams.get("providerId");

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

  return NextResponse.json({ reviews });
}
