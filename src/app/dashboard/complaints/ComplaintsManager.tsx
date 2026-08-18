"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardTitle } from "@/components/ui/Card";
import { formatDateTime } from "@/lib/utils";
import { MessageSquareWarning, Upload, X } from "lucide-react";

const COMPLAINT_TYPES = [
  { value: "service_quality", label: "Service Quality" },
  { value: "no_show", label: "Provider No-Show" },
  { value: "damaged_items", label: "Damaged Items" },
  { value: "payment_refund", label: "Payment / Refund" },
  { value: "other", label: "Other" },
];

const STATUS_VARIANTS: Record<string, "warning" | "info" | "success" | "danger"> = {
  open: "warning",
  investigating: "info",
  resolved: "success",
  dismissed: "danger",
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
  evidenceUrls: string;
  adminNotes: string | null;
  createdAt: string;
  bookingId: string | null;
}

export function ComplaintsManager({ initial }: { initial: Complaint[] }) {
  const router = useRouter();
  const complaints = initial;
  const [showForm, setShowForm] = useState(false);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [complaintType, setComplaintType] = useState("service_quality");
  const [priority, setPriority] = useState("normal");
  const [bookingId, setBookingId] = useState("");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload?type=complaints", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setEvidence((prev) => [...prev, data.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          description,
          complaintType,
          priority,
          bookingId: bookingId || undefined,
          evidenceUrls: evidence,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.error) ? data.error[0]?.message : data.error;
        throw new Error(msg || "Failed to file complaint");
      }
      setShowForm(false);
      setSubject("");
      setDescription("");
      setComplaintType("service_quality");
      setPriority("normal");
      setBookingId("");
      setEvidence([]);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to file complaint");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          File a complaint about a booking or vendor and track its progress.
        </p>
        <Button onClick={() => setShowForm((v) => !v)}>
          <MessageSquareWarning className="mr-1.5 h-4 w-4" />
          {showForm ? "Cancel" : "File a Complaint"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardTitle className="mb-4">File a Complaint</CardTitle>
          <div className="space-y-4">
            <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Provider did not deliver booked service" />
            <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Describe what happened..." />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Type" value={complaintType} onChange={(e) => setComplaintType(e.target.value)} options={COMPLAINT_TYPES} />
              <Select
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { value: "normal", label: "Normal" },
                  { value: "high", label: "High" },
                  { value: "urgent", label: "Urgent" },
                ]}
              />
            </div>
            <Input label="Booking ID (optional)" value={bookingId} onChange={(e) => setBookingId(e.target.value)} placeholder="Reference the booking this relates to" />

            <div>
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Evidence (optional)</p>
              <div className="space-y-2">
                {evidence.map((url, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
                    <span className="truncate text-gray-700 dark:text-gray-300">{url.split("/").pop()}</span>
                    <button type="button" onClick={() => setEvidence((d) => d.filter((_, idx) => idx !== i))}>
                      <X className="h-4 w-4 text-gray-400 hover:text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload evidence"}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button onClick={submit} disabled={submitting || uploading}>
              {submitting ? "Submitting..." : "Submit Complaint"}
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {complaints.length === 0 && (
          <Card>
            <p className="py-8 text-center text-sm text-gray-500">No complaints yet.</p>
          </Card>
        )}
        {complaints.map((c) => {
          const evidenceUrls = (() => {
            try {
              return JSON.parse(c.evidenceUrls || "[]") as string[];
            } catch {
              return [] as string[];
            }
          })();
          return (
            <Card key={c.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{c.subject}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {COMPLAINT_TYPES.find((t) => t.value === c.complaintType)?.label || c.complaintType}
                    {" · "}
                    {formatDateTime(c.createdAt)}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANTS[c.status] || "default"}>{c.status}</Badge>
              </div>

              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{c.description}</p>

              {c.bookingId && (
                <p className="mt-2 text-xs text-gray-400">Booking reference: {c.bookingId}</p>
              )}

              {evidenceUrls.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {evidenceUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 underline">
                      Evidence {i + 1}
                    </a>
                  ))}
                </div>
              )}

              {c.status === "resolved" && (
                <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
                  {c.resolution === "REFUNDED"
                    ? `Resolved with a full refund${c.refundAmount ? ` of ${c.refundAmount}` : ""}.`
                    : c.resolution === "PARTIAL_REFUND"
                      ? `Resolved with a partial refund${c.refundAmount ? ` of ${c.refundAmount}` : ""}.`
                      : "Resolved."}
                  {c.adminNotes ? ` Note: ${c.adminNotes}` : ""}
                </p>
              )}
              {c.status === "dismissed" && c.adminNotes && (
                <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  Note: {c.adminNotes}
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}