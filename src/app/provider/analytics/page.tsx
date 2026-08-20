import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { serverApi } from "@/lib/server-api";
import { formatCurrency, getCurrencyForCountry } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { BarChart3, DollarSign, CheckCircle2, XCircle, Star, Package } from "lucide-react";

interface AnalyticsData {
  summary: {
    totalRevenue: number;
    totalBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    avgBookingValue: number;
    avgRating: number | null;
    totalReviews: number;
  };
  monthlyRevenue: { month: string; revenue: number }[];
  bookingsByStatus: { status: string; count: number }[];
  topServices: { serviceId: string; name: string; bookings: number; revenue: number }[];
}

function MonthlyRevenueChart({ data, currency }: { data: AnalyticsData["monthlyRevenue"]; currency: string }) {
  const max = Math.max(...data.map((d) => d.revenue), 1);
  return (
    <div>
      <div className="flex h-48 items-end gap-3">
        {data.map((d) => (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] text-charcoal-500 dark:text-charcoal-400 ">
              {d.revenue > 0 ? formatCurrency(d.revenue, currency) : ""}
            </span>
            <div
              className="w-full rounded-t-lg bg-primary-600"
              style={{ height: `${Math.max((d.revenue / max) * 100, 1)}%`, minHeight: d.revenue > 0 ? 8 : 2 }}
              title={`${d.month}: ${formatCurrency(d.revenue, currency)}`}
            />
            <span className="text-[11px] text-charcoal-500 dark:text-charcoal-400 ">{d.month}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ProviderAnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "PROVIDER") redirect("/dashboard");

  let data: AnalyticsData | null = null;
  let loadError = "";
  try {
    data = await serverApi<AnalyticsData>("/api/provider/analytics?months=6");
  } catch {
    loadError = "Failed to load analytics. Please try again.";
  }

  if (!data) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="PROVIDER" />
        <PageContent>
          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Analytics</h1>
          </div>
          <Card>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">{loadError}</p>
              <Link href="/provider">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  const currency = getCurrencyForCountry(session.country);
  const maxServiceBookings = Math.max(...data.topServices.map((s) => s.bookings), 1);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-charcoal-500 dark:text-charcoal-400 ">Performance and revenue insights for your business</p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-5">
          <Card>
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-olive-700 dark:text-olive-400" />
              <div>
                <p className="text-xl font-bold">{formatCurrency(data.summary.totalRevenue, currency)}</p>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400 ">Revenue</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8 text-primary-600" />
              <div>
                <p className="text-xl font-bold">{data.summary.totalBookings}</p>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400 ">Bookings</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-xl font-bold">{data.summary.completedBookings}</p>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400 ">Completed</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-terracotta-600 dark:text-terracotta-400" />
              <div>
                <p className="text-xl font-bold">{data.summary.cancelledBookings}</p>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400 ">Cancelled</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-gold-500" />
              <div>
                <p className="text-xl font-bold">
                  {data.summary.avgRating ? data.summary.avgRating.toFixed(1) : "—"}
                </p>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400 ">{data.summary.totalReviews} Reviews</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardTitle className="mb-6 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary-600" />
              Revenue (last 6 months)
            </CardTitle>
            <MonthlyRevenueChart data={data.monthlyRevenue} currency={currency} />
            <p className="mt-4 text-sm text-charcoal-500 dark:text-charcoal-400 ">
              Avg booking value: {formatCurrency(data.summary.avgBookingValue, currency)}
            </p>
          </Card>

          <Card>
            <CardTitle className="mb-4">Bookings by Status</CardTitle>
            {data.bookingsByStatus.length === 0 ? (
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400 ">No bookings yet.</p>
            ) : (
              <div className="space-y-2">
                {data.bookingsByStatus.map((s) => (
                  <div key={s.status} className="flex items-center justify-between rounded-lg border border-charcoal-100 dark:border-charcoal-800 px-3 py-2 ">
                    <StatusBadge status={s.status} />
                    <span className="text-sm font-semibold">{s.count}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardTitle className="mb-4">Top Services</CardTitle>
          {data.topServices.length === 0 ? (
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400 ">No service bookings yet.</p>
          ) : (
            <div className="space-y-4">
              {data.topServices.map((s) => (
                <div key={s.serviceId}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-charcoal-500 dark:text-charcoal-400 ">
                      {s.bookings} booking{s.bookings !== 1 ? "s" : ""} · {formatCurrency(s.revenue, currency)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-sand dark:bg-charcoal-800 ">
                    <div
                      className="h-full rounded-full bg-primary-600"
                      style={{ width: `${(s.bookings / maxServiceBookings) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </PageContent>
    </div>
  );
}