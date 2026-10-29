import Link from "next/link";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export type CancellationDecision = {
  id: string; status: string; description: string; adminNotes: string | null;
  refundAmount: number | null; refundReference: string | null; refundPaidAt: string | null;
};

export function CancellationStatus({ requests, currency }: { requests?: CancellationDecision[]; currency: string }) {
  const request = requests?.[0];
  if (!request) return null;
  return <section className="mb-6 space-y-2 rounded-lg border border-charcoal-200 p-4 dark:border-charcoal-700" aria-label="Cancellation request">
    <h2 className="font-medium">Cancellation request</h2>
    <p className="text-sm text-charcoal-600 dark:text-charcoal-300">
      {request.status === "refund_pending" ? "Cancellation approved. Refund pending; no returned payment has been recorded yet."
        : request.status === "resolved" ? "Cancellation approved and the review is complete."
        : request.status === "dismissed" ? "Cancellation request declined."
        : "Awaiting review. The booking remains active until an administrator approves cancellation."}
    </p>
    <p className="whitespace-pre-wrap break-words text-sm">{request.description}</p>
    {request.adminNotes && <p className="whitespace-pre-wrap break-words text-sm">Decision notes: {request.adminNotes}</p>}
    {request.refundAmount != null && <p className="text-sm">Refund: {formatCurrency(request.refundAmount, currency)}{request.refundPaidAt ? ` · transfer recorded ${formatDateTime(request.refundPaidAt)}` : " · awaiting transfer"}</p>}
    {request.refundReference && <p className="break-words text-sm">Transfer reference: {request.refundReference}</p>}
    <Link href="/dashboard/complaints" className="inline-block text-sm text-primary-600 underline dark:text-primary-400">View requests and decisions</Link>
  </section>;
}
