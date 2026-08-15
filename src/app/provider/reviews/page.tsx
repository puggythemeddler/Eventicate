import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

import { StarRating } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { formatDate, formatDateTime } from "@/lib/utils";
import { REVIEW_CRITERIA } from "@/lib/constants";
import { User } from "lucide-react";

const providerCriteria = REVIEW_CRITERIA.customerToProvider;
const customerCriteria = REVIEW_CRITERIA.providerToCustomer;

interface ReviewReceived {
  id: string;
  createdAt: string;
  serviceQuality: number | null;
  professionalism: number | null;
  equipmentQuality: number | null;
  communication: number | null;
  reliability: number | null;
  comment: string | null;
  customerReviewer: { user: { firstName: string; lastName: string } } | null;
  booking: { event: { title: string } } | null;
}

interface ReviewGiven {
  id: string;
  createdAt: string;
  paymentReliability: number | null;
  customerCommunication: number | null;
  respectForAgreements: number | null;
  eventOrganization: number | null;
  comment: string | null;
  customer: { user: { firstName: string; lastName: string } } | null;
  booking: { event: { title: string } } | null;
}

interface BookingWithoutReview {
  id: string;
  event: { title: string; eventDate: string };
  customer: { user: { firstName: string; lastName: string } };
}

function RateCustomerForm({ bookingId }: { bookingId: string }) {
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const formData = new FormData(form);
        const body: Record<string, unknown> = { bookingId };
        for (const c of customerCriteria) {
          const val = formData.get(c.key);
          if (val) body[c.key] = Number(val);
        }
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) window.location.reload();
      }}
      className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
    >
      <p className="text-sm font-medium">Rate this customer</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {customerCriteria.map((c) => (
          <div key={c.key}>
            <label className="mb-1 block text-xs font-medium text-gray-600">{c.label}</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <label key={star} className="cursor-pointer">
                  <input type="radio" name={c.key} value={star} className="sr-only" />
                  <span className="text-xl text-gray-300 hover:text-yellow-400 peer-checked:text-yellow-400">
                    ★
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button type="submit" size="sm">Submit Rating</Button>
    </form>
  );
}

export default async function ReviewsPage() {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") redirect("/auth/login");

  let averageRating = 0;
  let totalReviews = 0;
  let reviewsReceived: ReviewReceived[] = [];
  let reviewsGiven: ReviewGiven[] = [];
  let completedBookingsWithoutReview: BookingWithoutReview[] = [];
  try {
    const data = await serverApi<{
      averageRating: number;
      totalReviews: number;
      reviewsReceived: ReviewReceived[];
      reviewsGiven: ReviewGiven[];
      completedBookingsWithoutReview: BookingWithoutReview[];
    }>("/api/provider/reviews");
    averageRating = data.averageRating;
    totalReviews = data.totalReviews;
    reviewsReceived = data.reviewsReceived;
    reviewsGiven = data.reviewsGiven;
    completedBookingsWithoutReview = data.completedBookingsWithoutReview;
  } catch {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Reviews & Ratings</h1>
          <div className="mt-2 flex items-center gap-2">
            <StarRating rating={averageRating} size="md" />
            <span className="text-sm text-gray-500">({totalReviews} reviews)</span>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Reviews Received</h2>
          {reviewsReceived.length === 0 ? (
            <Card>
              <CardDescription>No reviews yet.</CardDescription>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviewsReceived.map((review) => (
                <Card key={review.id}>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                        {review.customerReviewer?.user.firstName?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium">
                          {review.customerReviewer?.user.firstName} {review.customerReviewer?.user.lastName || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500">{review.booking?.event.title}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{formatDateTime(new Date(review.createdAt))}</span>
                  </div>
                  <div className="mb-3 grid grid-cols-5 gap-4">
                    {providerCriteria.map((c) => {
                      const val = review[c.key as keyof typeof review] as number | null | undefined;
                      return (
                        <div key={c.key} className="text-center">
                          <p className="text-xs text-gray-500">{c.label}</p>
                          <p className="text-lg font-bold">
                            {val ?? "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  {review.comment && (
                    <p className="text-sm text-gray-600 italic">&ldquo;{review.comment}&rdquo;</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Your Customer Ratings</h2>
          {reviewsGiven.length === 0 ? (
            <Card>
              <CardDescription>You haven&apos;t rated any customers yet.</CardDescription>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviewsGiven.map((review) => (
                <Card key={review.id}>
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-primary-600" />
                      <div>
                        <p className="font-medium">
                          {review.customer?.user.firstName} {review.customer?.user.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{review.booking?.event.title}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{formatDateTime(new Date(review.createdAt))}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {customerCriteria.map((c) => {
                      const val = review[c.key as keyof typeof review] as number | null | undefined;
                      return (
                        <div key={c.key} className="text-center">
                          <p className="text-xs text-gray-500">{c.label}</p>
                          <p className="text-lg font-bold">
                            {val ?? "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {completedBookingsWithoutReview.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Rate Customers</h2>
            <div className="space-y-4">
              {completedBookingsWithoutReview.map((booking) => (
                <Card key={booking.id}>
                  <div className="mb-3 flex items-center gap-3">
                    <User className="h-5 w-5 text-primary-600" />
                    <div>
                      <p className="font-medium">
                        {booking.customer.user.firstName} {booking.customer.user.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{booking.event.title} · {formatDate(new Date(booking.event.eventDate))}</p>
                    </div>
                  </div>
                  <RateCustomerForm bookingId={booking.id} />
                </Card>
              ))}
            </div>
          </div>
        )}
      </PageContent>
    </div>
  );
}
