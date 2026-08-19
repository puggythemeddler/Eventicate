import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { serverApi } from "@/lib/server-api";
import { formatCurrency, formatDate, getCurrencyForCountry } from "@/lib/utils";
import { FileText } from "lucide-react";

const typeOptions = [
  { value: "ALL", label: "All Types" },
  { value: "QUOTE", label: "Quotes" },
  { value: "INVOICE", label: "Invoices" },
  { value: "RECEIPT", label: "Receipts" },
];

const statusOptions = [
  { value: "ALL", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

const typeBadgeVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  QUOTE: "info",
  INVOICE: "warning",
  RECEIPT: "success",
};

const statusBadgeVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  DRAFT: "default",
  SENT: "info",
  ACCEPTED: "success",
  REJECTED: "danger",
  PAID: "success",
  OVERDUE: "danger",
  CANCELLED: "danger",
};

export default async function CustomerDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "CUSTOMER") redirect(session.role === "PROVIDER" ? "/provider" : "/admin");

  const { type, status } = await searchParams;

  const params = new URLSearchParams();
  if (type && type !== "ALL") params.set("type", type);
  if (status && status !== "ALL") params.set("status", status);
  const qs = params.toString();

  const { documents } = await serverApi<{
    documents: Array<{
      id: string;
      documentNumber: string;
      type: string;
      status: string;
      senderName: string;
      total: number;
      createdAt: string;
    }>;
  }>(`/api/documents${qs ? `?${qs}` : ""}`);
  const currency = getCurrencyForCountry(session.country);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-charcoal-900 dark:text-charcoal-100">
            Documents
          </h1>
          <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
            Quotes, invoices and receipts from your providers.
          </p>
        </div>

        <Card className="mb-6">
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="sm:w-48">
              <Select
                name="type"
                options={typeOptions}
                defaultValue={type || "ALL"}
                aria-label="Filter by document type"
              />
            </div>
            <div className="sm:w-48">
              <Select
                name="status"
                options={statusOptions}
                defaultValue={status || "ALL"}
                aria-label="Filter by status"
              />
            </div>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
        </Card>

        {documents.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-sand text-primary-700 dark:bg-charcoal-800 dark:text-primary-300">
                <FileText className="h-7 w-7" />
              </span>
              <div>
                <CardTitle className="text-center">No documents found</CardTitle>
                <p className="mx-auto mt-2 max-w-sm text-sm text-charcoal-500 dark:text-charcoal-400">
                  You don&apos;t have any documents yet. They will appear here when providers send you quotes or invoices.
                </p>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-charcoal-200 bg-sand/50 text-left text-sm text-charcoal-500 dark:border-charcoal-800 dark:bg-charcoal-800/50 dark:text-charcoal-400">
                    <th className="px-6 py-3 font-medium">Document #</th>
                    <th className="px-6 py-3 font-medium">Type</th>
                    <th className="px-6 py-3 font-medium">From</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 text-right font-medium">Total</th>
                    <th className="px-6 py-3 text-right font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className="border-b border-charcoal-100 last:border-0 transition-colors hover:bg-sand dark:border-charcoal-800 dark:hover:bg-charcoal-800"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/documents/${doc.id}`}
                          className="font-medium text-charcoal-900 hover:text-primary-700 dark:text-charcoal-100 dark:hover:text-primary-300"
                        >
                          {doc.documentNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={typeBadgeVariant[doc.type] || "default"}>
                          {doc.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-charcoal-500 dark:text-charcoal-400">
                        {doc.senderName}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={statusBadgeVariant[doc.status] || "default"}>
                          {doc.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">
                        {formatCurrency(doc.total, currency)}
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-charcoal-400 dark:text-charcoal-500">
                        {formatDate(doc.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </PageContent>
    </div>
  );
}