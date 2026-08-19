import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { ListingsManager } from "./ListingsManager";

export default async function ListingsPage() {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") redirect("/auth/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Venues & Packages</h1>
          <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
            Manage your venues, vehicles, catering menus, and photo/video packages.
          </p>
        </div>
        <ListingsManager />
      </PageContent>
    </div>
  );
}