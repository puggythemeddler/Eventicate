import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/layout/Navigation";
import { RSVPResponseForm } from "@/components/events/RSVPResponseForm";
import { serverApi } from "@/lib/server-api";
import { formatDateTime } from "@/lib/utils";
import { CalendarDays, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Respond to an invitation | Eventicate",
  robots: { index: false, follow: false },
};

interface RSVPInvite {
  guestName: string;
  guestsInvited: number;
  guestsAttending: number;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  closed: boolean;
  event: { title: string; eventDate: string; location: string; status: string };
}

export default async function RSVPPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let invitation: RSVPInvite;
  try {
    const response = await serverApi<{ invitation: RSVPInvite }>(`/api/rsvp/${encodeURIComponent(token)}`);
    invitation = response.invitation;
  } catch {
    notFound();
  }

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-950">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <div className="mb-7 border-l-4 border-gold-500 pl-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-charcoal-500 dark:text-charcoal-400">Eventicate · invitation</p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight text-charcoal-950 dark:text-charcoal-50 sm:text-4xl">You’re invited to {invitation.event.title}</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-charcoal-700 dark:text-charcoal-300">Let the organizer know if you’ll be there. This link is just for {invitation.guestName}.</p>
        </div>

        <section className="border-y border-charcoal-300 py-6 dark:border-charcoal-700" aria-label="Event details">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" /><div><p className="text-xs font-medium uppercase tracking-wide text-charcoal-500 dark:text-charcoal-400">When</p><p className="mt-1 text-sm font-medium text-charcoal-900 dark:text-charcoal-100">{formatDateTime(invitation.event.eventDate)}</p></div></div>
            <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold-600 dark:text-gold-400" aria-hidden="true" /><div><p className="text-xs font-medium uppercase tracking-wide text-charcoal-500 dark:text-charcoal-400">Where</p><p className="mt-1 text-sm font-medium text-charcoal-900 dark:text-charcoal-100">{invitation.event.location}</p></div></div>
          </div>
        </section>

        {invitation.closed ? (
          <p className="mt-7 border-l-2 border-charcoal-300 pl-4 text-sm text-charcoal-600 dark:border-charcoal-700 dark:text-charcoal-300">RSVPs are closed for this event. Please contact the organizer if you need to update your response.</p>
        ) : (
          <RSVPResponseForm token={token} guestName={invitation.guestName} guestsInvited={invitation.guestsInvited} initialStatus={invitation.status} initialGuestsAttending={invitation.guestsAttending} />
        )}
      </main>
    </div>
  );
}
