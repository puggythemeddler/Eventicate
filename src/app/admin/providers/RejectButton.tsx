"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function RejectButton({ providerId }: { providerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleReject = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, action: "reject_provider" }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      router.refresh();
    } catch {
      alert("Failed to reject provider");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="danger" size="sm" onClick={handleReject} disabled={loading}>
      {loading ? "..." : "Reject"}
    </Button>
  );
}
