import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { NotificationsList } from "@/components/notifications/NotificationsList";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  const role = session.role === "ADMIN" ? "ADMIN" : session.role === "PROVIDER" ? "PROVIDER" : "CUSTOMER";

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} />
      <PageContent>
        <NotificationsList />
      </PageContent>
    </div>
  );
}