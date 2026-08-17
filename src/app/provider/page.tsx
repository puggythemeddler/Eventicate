import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { serverApi } from "@/lib/server-api";
import { formatCurrency, formatDate, getCurrencyForCountry } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Package, Calendar, DollarSign, Star, Clock, AlertTriangle, CreditCard } from "lucide-react";

interface SubscriptionData {
  id: string;
  providerId: string;
  status: string;
  daysRemaining?: number;
  currentPeriodEnd?: string | null;
  plan: { id: string; name: string; price: number };
}

interface DashboardData {
  businessName: string;
  isApproved: boolean;
  averageRating: number;
  totalReviews: number;
  totalBookings: number;
  pendingBookings: number;
  revenue: number;
  recentBookings: {
    id: string;
    status: string;
    quotedPrice: number | null;
    event: { title: string; eventDate: string };
    customer: { user: { firstName: string; lastName: string } };
  }[];
}

async function SubscriptionBanner() {
  let subscription: SubscriptionData | null = null;
  try {
    const data = await serverApi<{ subscription: SubscriptionData | null }>(
      "/api/provider/subscription"
    );
    subscription = data.subscription;
  } catch {
    subscription = null;
  }

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
      ? formatDate(new Date(subscription.currentPeriodEnd))
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

  let dashboard: DashboardData | null = null;
  try {
    dashboard = await serverApi<DashboardData>("/api/provider/dashboard");
  } catch {
    redirect("/auth/login");
  }
  if (!dashboard) redirect("/auth/login");

  const currency = getCurrencyForCountry(session.country);
  const pendingBookings = dashboard.pendingBookings;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{dashboard.businessName}</h1>
          <p className="text-gray-500 dark:text-gray-400">Provider Dashboard</p>
          {!dashboard.isApproved && (
            <div className="mt-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              Your profile is pending admin approval.
            </div>
          )}
          <SubscriptionBanner />
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary-600" />
              <div>
                <p className="text-2xl font-bold">{dashboard.totalBookings}</p>
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
                  {formatCurrency(dashboard.revenue, currency)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{dashboard.averageRating.toFixed(1)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{dashboard.totalReviews} Reviews</p>
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <CardTitle className="mb-4">Recent Booking Requests</CardTitle>
          {dashboard.recentBookings.length === 0 ? (
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
                  {dashboard.recentBookings.map((booking) => (
                    <tr key={booking.id} className="border-b border-gray-50 dark:border-gray-800">
                      <td className="py-3">
                        {booking.customer.user.firstName} {booking.customer.user.lastName}
                      </td>
                      <td className="py-3">{booking.event.title}</td>
                      <td className="py-3">{formatDate(new Date(booking.event.eventDate))}</td>
                      <td className="py-3">
                        <StatusBadge status={booking.status} />
                      </td>
                      <td className="py-3">
                        {booking.quotedPrice
                          ? formatCurrency(booking.quotedPrice, currency)
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
