import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";
import { ActivityTab } from "./ActivityTab";
import { TrendsTab } from "./TrendsTab";
import { ProvidersTab } from "./ProvidersTab";
import { CustomersTab } from "./CustomersTab";

const TABS = [
  { key: "activity", label: "Activity" },
  { key: "trends", label: "Trends" },
  { key: "providers", label: "Providers" },
  { key: "customers", label: "Customers" },
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; type?: string; days?: string; page?: string; search?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const tab = TABS.some((t) => t.key === params.tab) ? params.tab! : "activity";

  const tabLink = (key: string) => `/admin/reports?tab=${key}`;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" />
      <PageContent>
        <div className="mb-6 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary-600" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Reports</h1>
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Platform activity and performance</p>
          </div>
        </div>

        <div className="mb-6 flex gap-1 border-b border-charcoal-200 dark:border-charcoal-800">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={tabLink(t.key)}
              className={cn(
                "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                tab === t.key
                  ? "border-primary-600 text-primary-700 dark:text-primary-300"
                  : "border-transparent text-charcoal-500 hover:text-charcoal-800 dark:text-charcoal-400 dark:hover:text-charcoal-200"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {tab === "activity" && <ActivityTab type={params.type} days={params.days} page={params.page} />}
        {tab === "trends" && <TrendsTab />}
        {tab === "providers" && <ProvidersTab search={params.search} page={params.page} />}
        {tab === "customers" && <CustomersTab search={params.search} page={params.page} />}
      </PageContent>
    </div>
  );
}