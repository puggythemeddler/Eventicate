"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { REVIEW_CRITERIA } from "@/lib/constants";

const customerCriteria = REVIEW_CRITERIA.providerToCustomer;

export function RateCustomerForm({ bookingId }: { bookingId: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { bookingId };
    for (const c of customerCriteria) {
      const val = formData.get(c.key);
      if (val) body[c.key] = Number(val);
    }
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to submit rating. Please try again.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4"
    >
      <p className="text-sm font-medium">Rate this customer</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {customerCriteria.map((c) => (
          <div key={c.key}>
            <label className="mb-1 block text-xs font-medium text-gray-600">{c.label}</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <label key={star} className="cursor-pointer">
                  <input
                    type="radio"
                    name={c.key}
                    value={star}
                    required
                    className="peer sr-only"
                  />
                  <span className="text-xl text-gray-300 transition-colors hover:text-yellow-400 peer-checked:text-yellow-400">
                    ★
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button type="submit" size="sm" disabled={submitting}>
        Submit Rating
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
