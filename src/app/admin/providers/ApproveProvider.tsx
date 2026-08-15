"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ApproveButton({ providerId }: { providerId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, action: "approve_provider" }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      router.refresh();
    } catch {
      alert("Failed to approve provider");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="sm" onClick={handleApprove} disabled={loading}>
      {loading ? "..." : "Approve"}
    </Button>
  );
}
