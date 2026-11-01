"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils";
import { Mail, Send, Trash2, Users } from "lucide-react";

export interface EventGuestRow {
  id: string;
  name: string;
  email: string;
  guestsInvited: number;
  guestsAttending: number;
  rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  invitationSentAt: string | null;
  respondedAt: string | null;
}

const statusLabel: Record<EventGuestRow["rsvpStatus"], string> = {
  PENDING: "Awaiting reply",
  ACCEPTED: "Attending",
  DECLINED: "Declined",
};

export function GuestListManager({ eventId, initialGuests, expectedGuestCount, closed }: {
  eventId: string;
  initialGuests: EventGuestRow[];
  expectedGuestCount: number;
  closed: boolean;
}) {
  const [guests, setGuests] = useState(initialGuests);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [guestsInvited, setGuestsInvited] = useState("1");
  const [contactPermission, setContactPermission] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const summary = useMemo(() => guests.reduce((total, guest) => ({
    invited: total.invited + guest.guestsInvited,
    attending: total.attending + guest.guestsAttending,
    waiting: total.waiting + Number(guest.rsvpStatus === "PENDING" && Boolean(guest.invitationSentAt)),
    unsent: total.unsent + Number(!guest.invitationSentAt),
    declined: total.declined + Number(guest.rsvpStatus === "DECLINED"),
  }), { invited: 0, attending: 0, waiting: 0, unsent: 0, declined: 0 }), [guests]);

  const addGuest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("add"); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/guests`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, guestsInvited: Number(guestsInvited), confirmedPermission: contactPermission }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not add guest");
      setGuests((current) => [...current, result.guest]);
      setName(""); setEmail(""); setGuestsInvited("1"); setContactPermission(false);
      setNotice("Guest added. Send the invitation when you’re ready.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not add guest");
    } finally { setBusy(""); }
  };

  const sendInvite = async (guest: EventGuestRow) => {
    setBusy(guest.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/guests/${encodeURIComponent(guest.id)}/invite`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send invitation");
      setGuests((current) => current.map((item) => item.id === guest.id ? result.guest : item));
      setNotice(`Invitation sent to ${guest.name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send invitation");
    } finally { setBusy(""); }
  };

  const removeGuest = async (guest: EventGuestRow) => {
    if (!window.confirm(`Remove ${guest.name} from this guest list?`)) return;
    setBusy(guest.id); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/guests/${encodeURIComponent(guest.id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not remove guest");
      setGuests((current) => current.filter((item) => item.id !== guest.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove guest");
    } finally { setBusy(""); }
  };

  return (
    <section id="guest-list" className="mb-8 border-y border-charcoal-200 py-6 dark:border-charcoal-800" aria-labelledby="guest-list-title">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-charcoal-500 dark:text-charcoal-400">Invitations</p>
          <h2 id="guest-list-title" className="mt-1 font-display text-xl font-semibold text-charcoal-900 dark:text-charcoal-100">Guest list</h2>
          <p className="mt-1 text-sm text-charcoal-600 dark:text-charcoal-300">Invite people and keep track of replies. Your event estimate is {expectedGuestCount} guests.</p>
        </div>
        <span className="inline-flex items-center gap-2 text-sm text-charcoal-500 dark:text-charcoal-400"><Users className="h-4 w-4" aria-hidden="true" />{summary.attending} attending</span>
      </div>

      <div className="mb-6 grid grid-cols-2 border-y border-charcoal-200 sm:grid-cols-5 dark:border-charcoal-800">
        {[{ label: "Places added", value: summary.invited }, { label: "Attending", value: summary.attending }, { label: "Awaiting reply", value: summary.waiting }, { label: "Not sent", value: summary.unsent }, { label: "Declined", value: summary.declined }].map((item, index) => (
          <div key={item.label} className={`py-3 ${index % 2 ? "pl-4 sm:pl-5" : ""} ${index > 1 ? "border-t border-charcoal-200 sm:border-t-0 dark:border-charcoal-800" : ""} ${index > 0 ? "sm:border-l sm:border-charcoal-200 sm:pl-5 dark:sm:border-charcoal-800" : "sm:pr-5"}`}>
            <p className="text-xs text-charcoal-500 dark:text-charcoal-400">{item.label}</p><p className="mt-1 font-display text-xl tabular-nums text-charcoal-900 dark:text-charcoal-100">{item.value}</p>
          </div>
        ))}
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-terracotta-700 dark:text-terracotta-300">{error}</p>}
      {notice && <p role="status" className="mb-4 text-sm text-olive-700 dark:text-olive-300">{notice}</p>}

      {!closed && <form onSubmit={addGuest} className="mb-7 grid gap-3 border-b border-charcoal-200 pb-6 sm:grid-cols-[1fr_1fr_130px_auto] sm:items-end dark:border-charcoal-800">
        <Input label="Guest name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
        <Input label="Email address" required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="guest@example.com" />
        <Input label="Places invited" required type="number" min="1" max="20" step="1" value={guestsInvited} onChange={(event) => setGuestsInvited(event.target.value)} />
        <Button type="submit" disabled={busy !== ""}><Users className="mr-2 h-4 w-4" />{busy === "add" ? "Adding…" : "Add guest"}</Button>
        <label className="inline-flex items-start gap-2 text-xs leading-relaxed text-charcoal-600 dark:text-charcoal-300 sm:col-span-4"><input type="checkbox" required checked={contactPermission} onChange={(event) => setContactPermission(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-charcoal-900" />I have permission to share this guest’s contact details and send them an event invitation.</label>
      </form>}

      {guests.length === 0 ? (
        <div className="py-7 text-center">
          <Mail className="mx-auto h-6 w-6 text-charcoal-400" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-charcoal-800 dark:text-charcoal-200">No guests added yet</p>
          <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">Add a guest to create an invitation and collect their RSVP.</p>
        </div>
      ) : (
        <ul className="divide-y divide-charcoal-200 dark:divide-charcoal-800">
          {guests.map((guest) => (
            <li key={guest.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1"><p className="font-medium text-charcoal-900 dark:text-charcoal-100">{guest.name}</p><span className="text-xs text-charcoal-500 dark:text-charcoal-400">{guest.rsvpStatus === "PENDING" && !guest.invitationSentAt ? "Invitation not sent" : statusLabel[guest.rsvpStatus]}</span></div>
                <p className="mt-1 break-all text-sm text-charcoal-600 dark:text-charcoal-300">{guest.email}</p>
                <p className="mt-1 text-xs text-charcoal-500 dark:text-charcoal-400">{guest.rsvpStatus === "ACCEPTED" ? `${guest.guestsAttending} of ${guest.guestsInvited} attending` : `${guest.guestsInvited} ${guest.guestsInvited === 1 ? "place" : "places"} invited`}{guest.invitationSentAt ? ` · sent ${formatDateTime(guest.invitationSentAt)}` : " · invitation not sent"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {!closed && <button type="button" disabled={busy !== ""} onClick={() => sendInvite(guest)} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary-700 underline underline-offset-4 disabled:opacity-50 dark:text-primary-300"><Send className="h-4 w-4" aria-hidden="true" />{busy === guest.id ? "Sending…" : guest.invitationSentAt ? "Resend invite" : "Send invite"}</button>}
                {!closed && <button type="button" disabled={busy !== ""} onClick={() => removeGuest(guest)} aria-label={`Remove ${guest.name}`} className="inline-flex min-h-11 items-center text-charcoal-500 hover:text-terracotta-700 disabled:opacity-50 dark:text-charcoal-400"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
