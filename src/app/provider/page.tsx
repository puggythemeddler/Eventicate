import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import prisma from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { getSubscriptionStatus } from "@/lib/subscription";
import { Package, Calendar, DollarSign, Star, Clock, AlertTriangle, CreditCard } from "lucide-react";

async function SubscriptionBanner({ providerId }: { providerId: string }) {
  const subscription = await getSubscriptionStatus(providerId);

  if (!subscription) {
    return (
      <div className="mb-6 rounded-lg border border-primary-200 bg-primary-50 p-4 dark:border-primary-800 dark:bg-primary-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary-600" />
            <p className="text-sm font-medium text-primary-800 dark:text-primary-300">
              Start your 30-day free trial to unlock all features
            </p>
          </div>
          <Link
            href="/provider/subscription"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    );
  }

  if (subscription.status === "TRIAL") {
    const days = subscription.daysRemaining ?? 0;
    if (days <= 0) {
      return (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Your trial has expired. Subscribe to continue using our services.
              </p>
            </div>
            <Link
              href="/provider/subscription"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Subscribe Now
            </Link>
          </div>
        </div>
      );
    }
    return (
      <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-yellow-600" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
              You are on a 30-day free trial. {days} day{days !== 1 ? "s" : ""} remaining.
            </p>
          </div>
          <Link
            href="/provider/subscription"
            className="rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
          >
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  if (subscription.status === "ACTIVE") {
    const nextBilling = subscription.currentPeriodEnd
      ? formatDate(subscription.currentPeriodEnd)
      : "N/A";
    return (
      <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-green-600" />
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              {subscription.plan.name} Plan — Next billing: {nextBilling}
            </p>
          </div>
          <Link
            href="/provider/subscription"
            className="rounded-lg border border-green-600 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/30"
          >
            Manage
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

export default async function ProviderDashboard() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "PROVIDER") redirect("/dashboard");

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
    include: {
      bookings: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          event: true,
          customer: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
      },
      _count: {
        select: { services: true, bookings: true, reviewsReceived: true },
      },
    },
  });

  if (!provider) redirect("/auth/login");

  const pendingBookings = provider.bookings.filter(
    (b) => b.status === "QUOTATION_REQUESTED" || b.status === "PENDING_APPROVAL"
  ).length;

  const revenue = await prisma.payment.aggregate({
    where: {
      booking: { providerId: provider.id },
      status: { in: ["DEPOSIT_PAID", "FULLY_PAID"] },
    },
    _sum: { amount: true },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{provider.businessName}</h1>
          <p className="text-gray-500 dark:text-gray-400">Provider Dashboard</p>
          {!provider.isApproved && (
            <div className="mt-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              Your profile is pending admin approval.
            </div>
          )}
          <SubscriptionBanner providerId={provider.id} />
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary-600" />
              <div>
                <p className="text-2xl font-bold">{provider._count.bookings}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Bookings</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{pendingBookings}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Requests</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(revenue._sum.amount || 0)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{provider.averageRating.toFixed(1)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{provider.totalReviews} Reviews</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardTitle className="mb-4">Recent Booking Requests</CardTitle>
          {provider.bookings.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No bookings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Event</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {provider.bookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="py-3">
                        {booking.customer.user.firstName} {booking.customer.user.lastName}
                      </td>
                      <td className="py-3">{booking.event.title}</td>
                      <td className="py-3">{formatDate(booking.event.eventDate)}</td>
                      <td className="py-3">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="py-3">
                        {booking.quotedPrice
                          ? formatCurrency(booking.quotedPrice)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </PageContent>
    </div>
  );
}
