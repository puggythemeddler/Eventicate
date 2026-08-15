"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea, Select } from "@/components/ui/Input";
import { formatDateTime } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
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
  status: string;
  adminNotes: string | null;
  createdAt: string;
  reporterId: string;
  bookingId: string | null;
  reporter: { firstName: string; lastName: string; email: string } | null;
}

export function ComplaintRow({ complaint: initial }: { complaint: Complaint }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [complaint, setComplaint] = useState(initial);
  const [status, setStatus] = useState(initial.status);
  const [notes, setNotes] = useState(initial.adminNotes || "");
  const [saving, setSaving] = useState(false);

  const updateStatus = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaintId: complaint.id, status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      const data = await res.json();
      setComplaint((prev) => ({ ...prev, status: data.complaint.status }));
      router.refresh();
    } catch {
      alert("Failed to update status");
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
      alert("Failed to save notes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-gray-50"
      >
        <div className="flex-1">
          <p className="font-medium text-gray-900">{complaint.subject}</p>
          <p className="text-sm text-gray-500">
            {complaint.reporter ? `${complaint.reporter.firstName} ${complaint.reporter.lastName}` : "Unknown"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={STATUS_VARIANTS[complaint.status] || "default"}>
            {complaint.status}
          </Badge>
          <span className="text-xs text-gray-400">{formatDateTime(complaint.createdAt)}</span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="mb-4">
            <p className="mb-1 text-xs font-medium text-gray-500">Description</p>
            <p className="text-sm text-gray-700">{complaint.description}</p>
          </div>

          {complaint.bookingId && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500">Booking Reference</p>
              <p className="text-sm text-gray-700">{complaint.bookingId}</p>
            </div>
          )}

          <div className="mb-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-gray-500">Status</p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select
                    options={STATUS_OPTIONS}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  />
                </div>
                <Button size="sm" onClick={updateStatus} disabled={saving || status === complaint.status}>
                  {saving ? "..." : "Update"}
                </Button>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Admin Notes</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Textarea
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
