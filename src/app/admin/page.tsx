import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { serverApi } from "@/lib/server-api";
import { formatCurrency, getCurrencyForCountry } from "@/lib/utils";
import { ApproveButton } from "./providers/ApproveProvider";

interface AnalyticsData {
  totalUsers: number;
  totalProviders: number;
  totalEvents: number;
  totalBookings: number;
  totalRevenue: number;
  recentBookings: {
    id: string;
    status: string;
    event: { title: string };
    provider: { businessName: string };
  }[];
  complaints: unknown[];
  popularCategories: { category: string; _count: { category: number } }[];
  pendingProviders: {
    id: string;
    businessName: string;
    category: string;
    user: { firstName: string; lastName: string; email: string };
  }[];
  openComplaints: number;
}

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  let analytics: AnalyticsData;
  try {
    const data = await serverApi<{ analytics: AnalyticsData }>("/api/admin");
    analytics = data.analytics;
  } catch {
    notFound();
  }
  const currency = getCurrencyForCountry(session.country);

  const {
    totalUsers,
    totalProviders,
    totalEvents,
    totalBookings,
    totalRevenue,
    pendingProviders,
    openComplaints,
    recentBookings,
    popularCategories,
  } = analytics;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" />
      <PageContent>
        <h1 className="mb-8 text-2xl font-bold">Admin Dashboard</h1>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          {[
            { label: "Total Users", value: totalUsers },
            { label: "Active Providers", value: totalProviders },
            { label: "Total Events", value: totalEvents },
            { label: "Total Bookings", value: totalBookings },
          ].map((stat) => (
            <Card key={stat.label}>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <Card>
            <CardTitle className="mb-2">Platform Revenue</CardTitle>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(totalRevenue, currency)}
            </p>
          </Card>
          <Card>
            <CardTitle className="mb-2">Open Complaints</CardTitle>
            <p className="text-3xl font-bold text-red-600">{openComplaints}</p>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardTitle className="mb-4">Pending Provider Approvals</CardTitle>
            {pendingProviders.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No pending approvals.</p>
            ) : (
              <div className="space-y-3">
                {pendingProviders.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                    <div>
                      <p className="font-medium">{p.businessName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {p.user.firstName} {p.user.lastName} · {p.category}
                      </p>
                    </div>
                    <ApproveButton providerId={p.id} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle className="mb-4">Popular Service Categories</CardTitle>
            <div className="space-y-2">
              {popularCategories.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <span className="text-sm">{cat.category.replace(/_/g, " ")}</span>
                  <span className="font-medium">{cat._count.category} providers</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="mt-8">
          <CardTitle className="mb-4">Recent Bookings</CardTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-2">Event</th>
                  <th className="pb-2">Provider</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 dark:border-gray-800">
                    <td className="py-2">{b.event.title}</td>
                    <td className="py-2">{b.provider.businessName}</td>
                    <td className="py-2">{b.status.replace(/_/g, " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContent>
    </div>
  );
}
