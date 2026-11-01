"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { CalendarDays, Check, Loader2 } from "lucide-react";

type RSVPStatus = "PENDING" | "ACCEPTED" | "DECLINED";

export function RSVPResponseForm({ token, guestName, guestsInvited, initialStatus, initialGuestsAttending }: {
  token: string;
  guestName: string;
  guestsInvited: number;
  initialStatus: RSVPStatus;
  initialGuestsAttending: number;
}) {
  const [status, setStatus] = useState<"ACCEPTED" | "DECLINED" | "">(initialStatus === "PENDING" ? "" : initialStatus);
  const [guestCount, setGuestCount] = useState(String(initialStatus === "ACCEPTED" ? Math.max(1, initialGuestsAttending) : 1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<RSVPStatus>(initialStatus);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!status) { setError("Choose whether you can attend"); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/rsvp/${encodeURIComponent(token)}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, guestsAttending: status === "ACCEPTED" ? Number(guestCount) : 0 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your response");
      setSaved(result.response.rsvpStatus);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your response");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mt-7 border-t border-charcoal-200 pt-6 dark:border-charcoal-800">
      {saved !== "PENDING" && (
        <p role="status" className="mb-5 flex items-center gap-2 text-sm font-medium text-olive-700 dark:text-olive-300"><Check className="h-4 w-4" aria-hidden="true" />Your response is saved. You can update it until the event starts.</p>
      )}
      <fieldset>
        <legend className="mb-3 font-medium text-charcoal-900 dark:text-charcoal-100">{guestName}, can you make it?</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {[{ value: "ACCEPTED" as const, title: "Yes, I’ll be there", detail: "Let the organizer know how many are coming." }, { value: "DECLINED" as const, title: "Sorry, I can’t make it", detail: "The organizer will see that you can’t attend." }].map((option) => (
            <label key={option.value} className={`flex min-h-20 cursor-pointer gap-3 border p-4 transition-colors ${status === option.value ? "border-charcoal-900 bg-sand dark:border-charcoal-100 dark:bg-charcoal-800" : "border-charcoal-200 hover:border-charcoal-400 dark:border-charcoal-700 dark:hover:border-charcoal-500"}`}>
              <input type="radio" name="rsvp" value={option.value} checked={status === option.value} onChange={() => setStatus(option.value)} className="mt-1 h-4 w-4 accent-charcoal-900" />
              <span><span className="block text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">{option.title}</span><span className="mt-1 block text-xs leading-relaxed text-charcoal-600 dark:text-charcoal-300">{option.detail}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      {status === "ACCEPTED" && <div className="mt-5 max-w-xs">
        <label htmlFor="rsvp-guest-count" className="mb-1.5 block text-sm font-medium text-charcoal-800 dark:text-charcoal-200">How many of your {guestsInvited} invited {guestsInvited === 1 ? "place" : "places"} will attend?</label>
        <select id="rsvp-guest-count" value={guestCount} onChange={(event) => setGuestCount(event.target.value)} className="min-h-11 w-full rounded-md border border-charcoal-300 bg-white px-3 text-sm text-charcoal-900 dark:border-charcoal-700 dark:bg-charcoal-950 dark:text-charcoal-100">
          {Array.from({ length: guestsInvited }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
        </select>
      </div>}

      {error && <p role="alert" className="mt-4 text-sm text-terracotta-700 dark:text-terracotta-300">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <CalendarDays className="mr-2 h-4 w-4" aria-hidden="true" />}{busy ? "Saving…" : saved === "PENDING" ? "Send RSVP" : "Update response"}</Button>
        <span className="text-xs text-charcoal-500 dark:text-charcoal-400">No account is needed to reply.</span>
      </div>
    </form>
  );
}
