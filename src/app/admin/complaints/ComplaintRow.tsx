"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea, Select, Input } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "refund_pending", label: "Refund pending (approved)" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

const RESOLUTION_OPTIONS = [
  { value: "NO_REFUND", label: "No refund" },
  { value: "REFUNDED", label: "Full refund" },
  { value: "PARTIAL_REFUND", label: "Partial refund" },
];

const STATUS_VARIANTS: Record<string, "warning" | "info" | "success" | "danger"> = {
  open: "warning",
  investigating: "info",
  refund_pending: "warning",
  resolved: "success",
  dismissed: "danger",
};

const PRIORITY_VARIANTS: Record<string, "default" | "warning" | "danger"> = {
  normal: "default",
  high: "warning",
  urgent: "danger",
};

const COMPLAINT_TYPE_LABELS: Record<string, string> = {
  service_quality: "Service Quality",
  no_show: "No-Show",
  damaged_items: "Damaged Items",
  payment_refund: "Payment / Refund",
  cancellation_request: "Cancellation request",
  other: "Other",
};

interface Complaint {
  id: string;
  subject: string;
  description: string;
  complaintType: string;
  priority: string;
  status: string;
  resolution: string | null;
  refundAmount: number | null;
  refundReference?: string | null;
  refundPaidAt?: string | null;
  evidenceUrls: string;
  adminNotes: string | null;
  createdAt: string;
  reporterId: string;
  bookingId: string | null;
  reporter: { firstName: string; lastName: string; email: string } | null;
  booking: {
    id: string;
    status: string;
    finalPrice: number | null;
    settledPaid?: number;
    agreementTerms?: string | null;
    provider: { businessName: string } | null;
    customer: { user: { firstName: string; lastName: string } } | null;
  } | null;
}

export function ComplaintRow({ complaint: initial }: { complaint: Complaint }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [complaint, setComplaint] = useState(initial);
  const [status, setStatus] = useState(initial.status);
  const [resolution, setResolution] = useState(initial.resolution || "NO_REFUND");
  const [refundAmount, setRefundAmount] = useState(initial.refundAmount?.toString() || "");
  const [notes, setNotes] = useState(initial.adminNotes || "");
  const [saving, setSaving] = useState(false);
  const [reference, setReference] = useState(initial.refundReference || "");
  const [error, setError] = useState("");
  const isFinal = ["resolved", "dismissed"].includes(complaint.status);
  const isRefund = ["REFUNDED", "PARTIAL_REFUND"].includes(resolution);

  const updateStatus = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          complaintId: complaint.id,
          status,
          resolution: ["resolved", "refund_pending"].includes(status) ? resolution : undefined,
          refundAmount: isRefund && refundAmount ? parseFloat(refundAmount) : undefined,
          refundReference: status === "resolved" && isRefund ? reference : undefined,
          adminNotes: notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      setComplaint(prev => ({ ...prev, ...data.complaint }));
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const saveNotes = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId: complaint.id, adminNotes: notes }),
      });
      if (!res.ok) throw new Error("Failed to save notes");
      const data = await res.json();
      setComplaint((prev) => ({ ...prev, adminNotes: data.complaint.adminNotes }));
      router.refresh();
    } catch {
      setError("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  const evidenceUrls = (() => {
    try {
      return JSON.parse(complaint.evidenceUrls || "[]") as string[];
    } catch {
      return [] as string[];
    }
  })();

  return (
    <div className="border-b border-charcoal-100 last:border-0 dark:border-charcoal-800">
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full flex-col items-start justify-between gap-3 px-6 py-4 text-left hover:bg-sand dark:hover:bg-charcoal-800/60 sm:flex-row sm:items-center"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-charcoal-900 dark:text-charcoal-100">{complaint.subject}</p>
            <Badge variant={PRIORITY_VARIANTS[complaint.priority] || "default"}>{complaint.priority}</Badge>
          </div>
          <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
            {complaint.reporter ? `${complaint.reporter.firstName} ${complaint.reporter.lastName}` : "Unknown"}
            {" · "}
            {COMPLAINT_TYPE_LABELS[complaint.complaintType] || complaint.complaintType}
            {complaint.booking && ` · booking: ${complaint.booking.id}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={STATUS_VARIANTS[complaint.status] || "default"}>
            {complaint.status.replace(/_/g, " ")}
          </Badge>
          <span className="text-xs text-charcoal-400 dark:text-charcoal-500">{formatDateTime(complaint.createdAt)}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-charcoal-100 bg-sand px-6 py-4 dark:border-charcoal-800 dark:bg-charcoal-800/50">
          <div className="mb-4">
            <p className="mb-1 text-xs font-medium text-charcoal-500 dark:text-charcoal-400">Description</p>
            <p className="text-sm text-charcoal-700 dark:text-charcoal-200">{complaint.description}</p>
          </div>

          {complaint.booking && (
            <div className="mb-4">
              <p className="text-xs font-medium text-charcoal-500 dark:text-charcoal-400">Booking</p>
              <p className="text-sm text-charcoal-700 dark:text-charcoal-200">
                {complaint.booking.id} · {complaint.booking.status}
                {complaint.booking.finalPrice != null && ` · ${complaint.booking.finalPrice}`}
                {complaint.booking.provider && ` · ${complaint.booking.provider.businessName}`}
              </p>
              <p className="mt-2 text-sm">Verified payments received: {complaint.booking.settledPaid ?? "Not available"}. Refund approvals are limited to these funds less other approved refunds.</p>
              {complaint.booking.agreementTerms && <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">Read signed cancellation and payment terms</summary><p className="mt-2 whitespace-pre-wrap break-words">{complaint.booking.agreementTerms}</p></details>}
            </div>
          )}

          {evidenceUrls.length > 0 && (
            <div className="mb-4">
              <p className="mb-1 text-xs font-medium text-charcoal-500 dark:text-charcoal-400">Evidence</p>
              <div className="flex flex-wrap gap-2">
                {evidenceUrls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-600 underline">
                    Evidence {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <div>
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end">
                <div className="w-full min-w-0 flex-1">
                  <Select
                    label="Decision status"
                    options={STATUS_OPTIONS}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={isFinal}
                  />
                </div>
                <Button size="sm" onClick={updateStatus} disabled={saving || isFinal || status === complaint.status}>
                  {saving ? "Saving…" : "Save decision"}
                </Button>
              </div>
            </div>
            <div>
              <Select
                label="Refund decision"
                options={RESOLUTION_OPTIONS}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                disabled={isFinal || complaint.status === "refund_pending" || !["resolved", "refund_pending"].includes(status)}
              />
            </div>
            <div>
              <Input
                label="Refund amount"
                type="number"
                min="0"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                disabled={!isRefund || isFinal || complaint.status === "refund_pending"}
                placeholder="0.00"
              />
            </div>
          </div>

          <p className="mb-4 text-sm text-charcoal-600 dark:text-charcoal-300">Refund pending approves the amount but does not send money. Return the funds through the original payment channel, then select Resolved and record the transfer reference. Approving a cancellation releases the booking; dismissing the request keeps it active.</p>
          {isRefund && status === "resolved" && !isFinal && <div className="mb-4"><Input label="Completed refund transfer reference" value={reference} onChange={e => setReference(e.target.value)} required /></div>}
          {complaint.refundPaidAt && <p className="mb-4 break-words text-sm">Refund transfer recorded {formatDateTime(complaint.refundPaidAt)} · {complaint.refundReference}</p>}
          {error && <p role="alert" className="mb-4 text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>}

          <div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end">
              <div className="w-full min-w-0 flex-1">
                <Textarea
                  label="Decision notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add admin notes..."
                />
              </div>
              <Button size="sm" onClick={saveNotes} disabled={saving}>
                {saving ? "..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
