"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Pencil, Trash2 } from "lucide-react";

export function EventActions({ eventId, status }: { eventId: string; status: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("Delete this event permanently? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete event.");
        setDeleting(false);
        return;
      }
      router.push("/dashboard/events");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={status === "COMPLETED"}
        onClick={() => router.push(`/dashboard/events/${eventId}/edit`)}
      >
        <Pencil className="mr-2 h-4 w-4" />
        Edit
      </Button>
      <Button variant="danger" size="sm" disabled={deleting} onClick={handleDelete}>
        <Trash2 className="mr-2 h-4 w-4" />
        {deleting ? "Deleting..." : "Delete"}
      </Button>
      {error && <p className="text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>}
    </div>
  );
}