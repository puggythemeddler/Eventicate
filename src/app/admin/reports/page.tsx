import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { formatDate } from "@/lib/utils";
import { Activity } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "ALL", label: "All Activity" },
  { value: "signup", label: "New Accounts" },
  { value: "booking", label: "Bookings" },
  { value: "payment", label: "Payments" },
  { value: "complaint", label: "Complaints" },
  { value: "provider_verified", label: "Provider Verifications" },
  { value: "document", label: "Documents" },
];

const DAYS_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "365", label: "All time" },
];

const TYPE_BADGE: Record<string, "info" | "warning" | "success" | "danger" | "default"> = {
  signup: "info",
  booking: "default",
  payment: "success",
  complaint: "danger",
  provider_verified: "warning",
  document: "info",
};

interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  link: string | null;
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; days?: string; page?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const { type, days, page } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const currentDays = days || "30";
  const currentType = type || "ALL";

  const params = new URLSearchParams();
  if (currentType !== "ALL") params.set("type", currentType);
  if (currentDays !== "30") params.set("days", currentDays);
  if (currentPage > 1) params.set("page", String(currentPage));
  const qs = params.toString();

  const data = await serverApi<{
    events: ActivityEvent[];
    totals: Record<string, number>;
    total: number;
    page: number;
    totalPages: number;
  }>(`/api/admin/activity${qs ? `?${qs}` : ""}`);

  const labelFor = (t: string) =>
    TYPE_OPTIONS.find((o) => o.value === t)?.label.replace("All Activity", "All").toLowerCase() ?? t;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" />
      <PageContent>
        <div className="mb-8 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary-600" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Activity Log</h1>
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
              {data.total} events in this view
            </p>
          </div>
        </div>

        <Card className="mb-6">
          <form className="flex gap-4">
            <div className="w-56">
              <Select name="type" options={TYPE_OPTIONS} defaultValue={currentType} />
            </div>
            <div className="w-44">
              <Select name="days" options={DAYS_OPTIONS} defaultValue={currentDays} />
            </div>
            <Button type="submit" variant="secondary">Filter</Button>
            {qs && (
              <Link href="/admin/reports">
                <Button type="button" variant="ghost">Clear</Button>
              </Link>
            )}
          </form>
        </Card>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(data.totals).map(([key, count]) => (
            <Card key={key} className="p-3">
              <p className="text-xl font-bold text-charcoal-900 dark:text-charcoal-100">{count}</p>
              <p className="text-xs text-charcoal-500 dark:text-charcoal-400">{labelFor(key)}</p>
            </Card>
          ))}
        </div>

        <Card className="overflow-hidden p-0">
          {data.events.length === 0 ? (
            <div className="py-10 text-center text-sm text-charcoal-500 dark:text-charcoal-400">
              No activity found for the selected filters.
            </div>
          ) : (
            <ul className="divide-y divide-charcoal-100 dark:divide-charcoal-800">
              {data.events.map((event) => (
                <li key={event.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={TYPE_BADGE[event.type] || "default"}>{labelFor(event.type)}</Badge>
                      <p className="font-medium text-charcoal-900 dark:text-charcoal-100">{event.title}</p>
                    </div>
                    <p className="mt-0.5 text-sm text-charcoal-500 dark:text-charcoal-400">{event.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-charcoal-400 dark:text-charcoal-500">{formatDate(event.date)}</span>
                    {event.link && (
                      <Link href={event.link} className="text-xs font-medium text-primary-600 hover:underline">
                        View
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {data.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
              Page {data.page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <Link
                  href={`/admin/reports?${new URLSearchParams({
                    ...(currentType !== "ALL" ? { type: currentType } : {}),
                    ...(currentDays !== "30" ? { days: currentDays } : {}),
                    page: String(currentPage - 1),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">← Previous</Button>
                </Link>
              )}
              {currentPage < data.totalPages && (
                <Link
                  href={`/admin/reports?${new URLSearchParams({
                    ...(currentType !== "ALL" ? { type: currentType } : {}),
                    ...(currentDays !== "30" ? { days: currentDays } : {}),
                    page: String(currentPage + 1),
                  }).toString()}`}
                >
                  <Button variant="outline" size="sm">Next →</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </PageContent>
    </div>
  );
}