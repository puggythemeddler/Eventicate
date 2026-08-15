import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import prisma from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const [
    totalUsers,
    totalProviders,
    totalEvents,
    totalBookings,
    totalRevenue,
    pendingProviders,
    openComplaints,
    recentBookings,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.providerProfile.count({ where: { isApproved: true } }),
    prisma.event.count(),
    prisma.booking.count(),
    prisma.payment.aggregate({
      where: { status: { in: ["DEPOSIT_PAID", "FULLY_PAID"] } },
      _sum: { amount: true },
    }),
    prisma.providerProfile.findMany({
      where: { isApproved: false },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    }),
    prisma.complaint.count({ where: { status: "open" } }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        event: { select: { title: true } },
        provider: { select: { businessName: true } },
      },
    }),
  ]);

  const popularCategories = await prisma.providerProfile.groupBy({
    by: ["category"],
    _count: { category: true },
    orderBy: { _count: { category: "desc" } },
  });

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
              {formatCurrency(totalRevenue._sum.amount || 0)}
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
                    <form action={`/api/admin`} method="POST">
                      <button
                        type="button"
                        className="rounded-lg bg-primary-600 px-3 py-1 text-sm text-white hover:bg-primary-700"
                      >
                        Approve
                      </button>
                    </form>
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
