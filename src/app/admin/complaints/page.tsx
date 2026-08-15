import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import prisma from "@/lib/prisma";
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

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;

  const complaints = await prisma.complaint.findMany({
    where,
    include: {
      reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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
                  createdAt: complaint.createdAt.toISOString(),
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
