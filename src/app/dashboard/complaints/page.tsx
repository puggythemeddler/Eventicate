import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { serverApi } from "@/lib/server-api";
import { ComplaintsManager } from "./ComplaintsManager";

interface ComplaintRow {
  id: string;
  subject: string;
  description: string;
  complaintType: string;
  priority: string;
  status: string;
  resolution: string | null;
  refundAmount: number | null;
  evidenceUrls: string;
  adminNotes: string | null;
  createdAt: string;
  bookingId: string | null;
}

export default async function ComplaintsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role === "ADMIN") redirect("/admin/complaints");

  let complaints: ComplaintRow[] = [];
  try {
    const data = await serverApi<{ complaints: ComplaintRow[] }>("/api/complaints/my");
    complaints = data.complaints ?? [];
  } catch {
    complaints = [];
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role === "PROVIDER" ? "PROVIDER" : "CUSTOMER"} />
      <PageContent>
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Complaints</h1>
          <p className="text-charcoal-500 dark:text-charcoal-400">File and track complaints about bookings or vendors</p>
        </div>
        <ComplaintsManager initial={complaints} />
      </PageContent>
    </div>
  );
}