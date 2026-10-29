"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";

export function CancellationRequest({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancellation`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send your request");
      setSent(true); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Could not send your request"); }
    finally { setBusy(false); }
  }

  if (sent) return <p role="status" className="text-sm text-charcoal-600 dark:text-charcoal-300">Cancellation requested. Your booking stays active during review. <Link href="/dashboard/complaints" className="text-primary-600 underline dark:text-primary-400">Track the decision</Link></p>;
  return <div className="w-full max-w-lg">
    {!open ? <Button variant="outline" onClick={() => setOpen(true)}>Request cancellation</Button> : (
      <form onSubmit={submit} className="space-y-3 text-left">
        <p className="text-sm text-charcoal-600 dark:text-charcoal-300">An administrator will review the booking terms and any payment received. Sending this request does not cancel the booking or guarantee a refund.</p>
        <Textarea label="Reason for cancellation" value={reason} onChange={e => setReason(e.target.value)} minLength={10} maxLength={2000} required rows={3} />
        {error && <p role="alert" className="text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>{busy ? "Sending…" : "Send cancellation request"}</Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Keep booking</Button>
        </div>
      </form>
    )}
  </div>;
}
