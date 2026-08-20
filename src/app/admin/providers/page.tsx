import { redirect, notFound } from "next/navigation";
import Link from "next/link";
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
import { AddProviderButton } from "./AddProvider";
import { EditProviderButton, DeactivateButton, DeleteProviderButton, VerifyProviderButton } from "./ProviderActions";

interface ProviderRow {
  id: string;
  businessName: string;
  category: string;
  city: string | null;
  country: string | null;
  description: string | null;
  isApproved: boolean;
  verificationStatus: string;
  verificationDocuments: string;
  verificationNote: string | null;
  averageRating: number;
  hasPaid: boolean;
  isActive: boolean;
  user: { firstName: string; lastName: string; email: string; phone: string | null };
  subscription: { status: string; plan: { name: string } | null; currentPeriodEnd: string | null } | null;
  _count: { bookings: number; reviewsReceived: number };
}

const VERIFICATION_META: Record<string, { label: string; className: string }> = {
  VERIFIED: { label: "Verified", className: "bg-olive-100 dark:bg-olive-900/50 text-olive-700 dark:text-olive-300" },
  PENDING: { label: "Verification Pending", className: "bg-gold-100 text-gold-800 dark:bg-gold-900/50 dark:text-gold-300" },
  REJECTED: { label: "Verification Rejected", className: "bg-terracotta-100 dark:bg-terracotta-900/50 text-terracotta-700 dark:text-terracotta-300" },
  NONE: { label: "Not Verified", className: "bg-sand dark:bg-charcoal-800 text-charcoal-600 dark:text-charcoal-300" },
};

const APPROVAL_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "approved", label: "Approved" },
  { value: "unapproved", label: "Unapproved" },
];

const PAYMENT_OPTIONS = [
  { value: "ALL", label: "All Payments" },
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Not Paid" },
];

const CATEGORY_OPTIONS = [
  { value: "ALL", label: "All Categories" },
  ...SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ approval?: string; category?: string; payment?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const { approval, category, payment } = await searchParams;

  const params = new URLSearchParams();
  if (approval === "approved") params.set("approval", "approved");
  if (approval === "unapproved") params.set("approval", "pending");
  if (category && category !== "ALL") params.set("category", category);
  if (payment === "paid") params.set("payment", "paid");
  if (payment === "unpaid") params.set("payment", "unpaid");
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

  const paidCount = providers.filter((p) => p.hasPaid).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Providers</h1>
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
              {providers.length} providers · {paidCount} paid
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <div className="rounded-lg bg-gold-50 px-4 py-2 text-sm text-gold-800 dark:bg-gold-900/50 dark:text-gold-300">
                {pendingCount} awaiting approval
              </div>
            )}
            <AddProviderButton />
          </div>
        </div>

        <Card className="mb-6">
          <form className="flex gap-4">
            <div className="w-44">
              <Select name="approval" options={APPROVAL_OPTIONS} defaultValue={approval || "ALL"} />
            </div>
            <div className="w-44">
              <Select name="payment" options={PAYMENT_OPTIONS} defaultValue={payment || "ALL"} />
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
              <tr className="border-b border-charcoal-200 dark:border-charcoal-800 text-left text-charcoal-500 dark:text-charcoal-400">
                <th className="px-6 py-3 font-medium">Business</th>
                <th className="px-6 py-3 font-medium">Owner</th>
                <th className="px-6 py-3 font-medium">Category</th>
                <th className="px-6 py-3 font-medium">City</th>
                <th className="px-6 py-3 font-medium">Approved</th>
                <th className="px-6 py-3 font-medium">Payment</th>
                <th className="px-6 py-3 font-medium">Rating</th>
                <th className="px-6 py-3 font-medium text-right">Reviews</th>
                <th className="px-6 py-3 font-medium text-right">Bookings</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((p) => (
                <tr
                  key={p.id}
                  className={`border-b border-charcoal-100 dark:border-charcoal-800 last:border-0 hover:bg-sand dark:hover:bg-charcoal-800 ${
                    !p.isActive ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-charcoal-900 dark:text-charcoal-100">
                    <Link
                      href={`/providers/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-700 hover:underline dark:text-primary-400"
                    >
                      {p.businessName}
                    </Link>
                    {p.verificationStatus && p.verificationStatus !== "NONE" && (
                      <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${VERIFICATION_META[p.verificationStatus]?.className || VERIFICATION_META.NONE.className}`}>
                        {VERIFICATION_META[p.verificationStatus]?.label || "Not Verified"}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-charcoal-500 dark:text-charcoal-400">
                    {p.user.firstName} {p.user.lastName}
                    {!p.isActive && (
                      <span className="ml-2 rounded bg-charcoal-100 dark:bg-charcoal-800 px-1.5 py-0.5 text-[10px] font-medium text-charcoal-600 dark:text-charcoal-300">
                        Deactivated
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-charcoal-500 dark:text-charcoal-400">
                    {SERVICE_CATEGORIES.find((c) => c.value === p.category)?.label || p.category}
                  </td>
                  <td className="px-6 py-4 text-charcoal-500 dark:text-charcoal-400">{p.city || "—"}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={p.isApproved ? "AVAILABLE" : "PENDING"} />
                  </td>
                  <td className="px-6 py-4">
                    {p.hasPaid ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-olive-100 dark:bg-olive-900/50 px-2.5 py-0.5 text-xs font-medium text-olive-700 dark:text-olive-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-olive-600" />
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta-100 dark:bg-terracotta-900/50 px-2.5 py-0.5 text-xs font-medium text-terracotta-700 dark:text-terracotta-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-terracotta-600" />
                        Not Paid
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StarRating rating={p.averageRating} />
                  </td>
                  <td className="px-6 py-4 text-right text-charcoal-500 dark:text-charcoal-400">{p._count.reviewsReceived}</td>
                  <td className="px-6 py-4 text-right text-charcoal-500 dark:text-charcoal-400">{p._count.bookings}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!p.isApproved && (
                        <>
                          <ApproveButton providerId={p.id} />
                          <RejectButton providerId={p.id} />
                        </>
                      )}
                      <VerifyProviderButton provider={p} />
                      <EditProviderButton provider={p} />
                      <DeactivateButton provider={p} />
                      <DeleteProviderButton provider={p} />
                    </div>
                  </td>
                </tr>
              ))}
              {providers.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-charcoal-500 dark:text-charcoal-400">
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