import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import prisma from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

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

  const where: Record<string, unknown> = { recipientId: session.id };
  if (type && type !== "ALL") where.type = type;
  if (status && status !== "ALL") where.status = status;

  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Documents</h1>
        </div>

        <Card className="mb-6">
          <form className="flex gap-4">
            <div className="w-48">
              <Select
                name="type"
                options={typeOptions}
                defaultValue={type || "ALL"}
              />
            </div>
            <div className="w-48">
              <Select
                name="status"
                options={statusOptions}
                defaultValue={status || "ALL"}
              />
            </div>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
        </Card>

        {documents.length === 0 ? (
          <Card>
            <CardTitle>No documents found</CardTitle>
            <p className="mt-2 text-sm text-gray-500">
              You don&apos;t have any documents yet. They will appear here when providers send you quotes or invoices.
            </p>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-6 py-3 font-medium">Document #</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">From</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Total</th>
                  <th className="px-6 py-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr
                    key={doc.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/documents/${doc.id}`}
                        className="font-medium text-gray-900 hover:text-primary-600 dark:text-gray-100"
                      >
                        {doc.documentNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={typeBadgeVariant[doc.type] || "default"}>
                        {doc.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {doc.senderName}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={statusBadgeVariant[doc.status] || "default"}>
                        {doc.status.replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      {formatCurrency(doc.total)}
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(doc.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </PageContent>
    </div>
  );
}
