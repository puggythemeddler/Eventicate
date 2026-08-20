"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function ToggleUserStatus({ userId, isActive }: { userId: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (isActive && !window.confirm("Deactivate this user? They will no longer be able to sign in.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive: !isActive }),
      });
      if (!res.ok) throw new Error("Failed to update");
      router.refresh();
    } catch {
      alert("Failed to update user status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isActive ? "danger" : "primary"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? "..." : isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
