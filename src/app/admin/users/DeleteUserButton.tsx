"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";

export function DeleteUserButton({ userId, name }: { userId: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete ${name}'s account? This permanently removes their data and cannot be undone.`
      )
    ) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete user");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="danger" size="sm" onClick={handleDelete} disabled={loading}>
        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
        {loading ? "Deleting..." : "Delete"}
      </Button>
      {error && (
        <p className="max-w-[220px] text-right text-xs text-terracotta-600 dark:text-terracotta-400">
          {error}
        </p>
      )}
    </div>
  );
}