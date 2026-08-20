"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function AcceptTermsButtons({ home }: { home: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/accept-terms", { method: "POST" });
      if (!res.ok) throw new Error("accept failed");
      router.push(home);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function decline() {
    setLoading(true);
    setError("");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // even if logout fails, return the user to the login page
    }
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-terracotta-50 p-3 text-sm text-terracotta-700 dark:bg-terracotta-900/30 dark:text-terracotta-400">
          {error}
        </p>
      )}
      <Button onClick={accept} disabled={loading} className="w-full">
        {loading ? "Please wait..." : "I Accept the Terms"}
      </Button>
      <Button onClick={decline} disabled={loading} variant="ghost" className="w-full">
        Decline and Sign Out
      </Button>
    </div>
  );
}