import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBadge, StarRating } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { ApproveButton } from "./ApproveProvider";
import { RejectButton } from "./RejectButton";

interface ProviderRow {
  id: string;
  businessName: string;
  category: string;
  city: string | null;
  isApproved: boolean;
  averageRating: number;
  user: { firstName: string; lastName: string; email: string };
  _count: { bookings: number; reviewsReceived: number };
}

const APPROVAL_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "approved", label: "Approved" },
  { value: "unapproved", label: "Unapproved" },
];

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "All Categories" },
  ...SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ approval?: string; category?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const { approval, category } = await searchParams;

  const params = new URLSearchParams();
  if (approval === "approved") params.set("approval", "approved");
  if (approval === "unapproved") params.set("approval", "pending");
  if (category && category !== "ALL") params.set("category", category);
  const query = params.toString();

  let providers: ProviderRow[];
  let pendingCount = 0;
  try {
    const data = await serverApi<{ providers: ProviderRow[]; pendingCount: number }>(
      `/api/admin/providers${query ? `?${query}` : ""}`
    );
    providers = data.providers;
    pendingCount = data.pendingCount;
  } catch {
    notFound();
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Providers</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{providers.length} providers</p>
          </div>
          {pendingCount > 0 && (
            <div className="rounded-lg bg-yellow-50 px-4 py-2 text-sm text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
              {pendingCount} awaiting approval
            </div>
          )}
        </div>

        <Card className="mb-6">
          <form className="flex gap-4">
            <div className="w-44">
              <Select name="approval" options={APPROVAL_OPTIONS} defaultValue={approval || "ALL"} />
            </div>
            <div className="w-48">
              <Select name="category" options={CATEGORY_OPTIONS} defaultValue={category || "ALL"} />
            </div>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
        </Card>

        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="px-6 py-3 font-medium">Business</th>
                <th className="px-6 py-3 font-medium">Owner</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">City</th>
                <th className="px-6 py-3 font-medium">Approved</th>
                <th className="px-6 py-3 font-medium">Rating</th>
                <th className="px-6 py-3 font-medium text-right">Reviews</th>
                <th className="px-6 py-3 font-medium text-right">Bookings</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{p.businessName}</td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {p.user.firstName} {p.user.lastName}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {SERVICE_CATEGORIES.find((c) => c.value === p.category)?.label || p.category}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{p.city || "—"}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.isApproved ? "AVAILABLE" : "PENDING"} />
                  </td>
                  <td className="px-6 py-4">
                    <StarRating rating={p.averageRating} />
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">{p._count.reviewsReceived}</td>
                  <td className="px-6 py-4 text-right text-gray-500 dark:text-gray-400">{p._count.bookings}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {!p.isApproved && (
                        <>
                          <ApproveButton providerId={p.id} />
                          <RejectButton providerId={p.id} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {providers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No providers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </PageContent>
    </div>
  );
}
