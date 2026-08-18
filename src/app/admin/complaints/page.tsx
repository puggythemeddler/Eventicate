import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { serverApi } from "@/lib/server-api";
import { ComplaintRow } from "./ComplaintRow";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

export default async function AdminComplaintsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role !== "ADMIN") redirect("/dashboard");

  const { status } = await searchParams;

  const complaints = (
    await serverApi<{
      complaints: Array<{
        id: string;
        subject: string;
        description: string;
        complaintType: string;
        priority: string;
        resolution: string | null;
        refundAmount: number | null;
        evidenceUrls: string;
        status: string;
        adminNotes: string | null;
        createdAt: string;
        reporterId: string;
        bookingId: string | null;
        reporter: { firstName: string; lastName: string; email: string } | null;
        booking: {
          id: string;
          status: string;
          finalPrice: number | null;
          provider: { businessName: string } | null;
          customer: { user: { firstName: string; lastName: string } } | null;
        } | null;
      }>;
    }>(`/api/admin/complaints${status && status !== "ALL" ? `?status=${status}` : ""}`)
  ).complaints;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Complaints</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{complaints.length} total</p>
          </div>
        </div>

        <Card className="mb-6">
          <form className="flex gap-4">
            <div className="w-48">
              <Select name="status" options={STATUS_OPTIONS} defaultValue={status || "ALL"} />
            </div>
            <Button type="submit" variant="secondary">Filter</Button>
          </form>
        </Card>

        <Card className="overflow-hidden p-0">
          {complaints.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">No complaints found</div>
          ) : (
            complaints.map((complaint) => (
              <ComplaintRow
                key={complaint.id}
                complaint={{
                  ...complaint,
                  createdAt: complaint.createdAt,
                  reporter: complaint.reporter
                    ? {
                        firstName: complaint.reporter.firstName,
                        lastName: complaint.reporter.lastName,
                        email: complaint.reporter.email,
                      }
                    : null,
                }}
              />
            ))
          )}
        </Card>
      </PageContent>
    </div>
  );
}
