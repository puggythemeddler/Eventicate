"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Upload, ShieldCheck, X } from "lucide-react";

const STATUS_META: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" }> = {
  VERIFIED: { label: "Verified Business", variant: "success" },
  PENDING: { label: "Verification Pending", variant: "warning" },
  REJECTED: { label: "Verification Rejected", variant: "danger" },
  NONE: { label: "Not Verified", variant: "default" },
};

export function VerificationSection({
  verificationStatus,
  verificationNote,
  isApproved,
}: {
  verificationStatus: string;
  verificationNote: string | null;
  isApproved: boolean;
}) {
  const meta = STATUS_META[verificationStatus] || STATUS_META.NONE;
  const [documents, setDocuments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload?type=verification", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDocuments((prev) => [...prev, data.url]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function submit() {
    if (documents.length === 0) {
      setUploadError("Please upload at least one document (e.g. business permit, ID, or certificate).");
      return;
    }
    setSubmitting(true);
    setUploadError(null);
    try {
      const res = await fetch("/api/provider/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.error) ? "Invalid request" : data.error);
      window.location.reload();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary-600" />
          Business Verification
        </CardTitle>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      <p className="mb-4 text-sm text-charcoal-600 dark:text-charcoal-300">
        Verified businesses appear with a badge and are prioritized by customers.
        {!isApproved && verificationStatus !== "VERIFIED" && " You must be approved to receive bookings."}
      </p>

      {verificationStatus === "VERIFIED" && (
        <p className="text-sm font-medium text-olive-700 dark:text-olive-400">
          Your business is verified. Customers can see the verified badge on your profile.
        </p>
      )}

      {verificationStatus === "PENDING" && (
        <p className="text-sm text-gold-700 dark:text-gold-400">
          Your verification request is under review by our team. This usually takes 1–2 business days.
        </p>
      )}

      {verificationStatus === "REJECTED" && (
        <p className="mb-2 text-sm text-terracotta-700 dark:text-terracotta-400">
          Your request was not approved. {verificationNote ? `Reason: ${verificationNote}` : "Please review your documents and try again."}
        </p>
      )}

      {(verificationStatus === "NONE" || verificationStatus === "REJECTED") && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-charcoal-700 dark:text-charcoal-200">
              Supporting documents
            </p>
            <div className="space-y-2">
              {documents.map((url, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-charcoal-200 px-3 py-2 text-sm dark:border-charcoal-700">
                  <span className="truncate text-charcoal-700 dark:text-charcoal-200">{url.split("/").pop()}</span>
                  <button type="button" onClick={() => setDocuments((d) => d.filter((_, idx) => idx !== i))} aria-label="Remove document">
                    <X className="h-4 w-4 text-charcoal-400 hover:text-terracotta-600 dark:text-charcoal-500 dark:hover:text-terracotta-400" />
                  </button>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="text-xs text-charcoal-400 dark:text-charcoal-500">No documents uploaded yet.</p>
              )}
            </div>
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-charcoal-300 px-3 py-2 text-sm text-charcoal-700 hover:bg-sand dark:border-charcoal-600 dark:text-charcoal-200 dark:hover:bg-charcoal-800">
              <Upload className="h-4 w-4" />
              {uploading ? "Uploading..." : "Upload document"}
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
          </div>
          <Textarea
            label="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Anything the review team should know..."
          />
          {uploadError && <p className="text-sm text-terracotta-700 dark:text-terracotta-400">{uploadError}</p>}
          <Button onClick={submit} disabled={submitting || uploading}>
            {submitting ? "Submitting..." : "Submit for Verification"}
          </Button>
        </div>
      )}
    </Card>
  );
}