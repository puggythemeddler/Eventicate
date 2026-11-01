import { redirect, notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { NewTicketEventForm } from "@/components/tickets/NewTicketEventForm";
import { getSession } from "@/lib/auth";
import { serverApi } from "@/lib/server-api";

export default async function NewTicketEventPage() {
  const session = await getSession();
  if (!session) redirect("/auth/login");
  if (session.role === "ADMIN") notFound();
  const commission = await serverApi<{ rate: number }>("/api/ticketing/commission").catch(() => ({ rate: 0.06 }));

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} />
      <PageContent>
        <div className="mb-8">
          <p className="text-sm font-medium text-charcoal-500 dark:text-charcoal-400">Eventickets · organizer workspace</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-charcoal-900 dark:text-charcoal-100">Publish an event</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">Add the details attendees need and choose the tickets you want to offer. You can publish now or save a draft.</p>
        </div>
        <NewTicketEventForm defaultCountry={session.country || "Kenya"} commissionRate={commission.rate} />
      </PageContent>
    </div>
  );
}
