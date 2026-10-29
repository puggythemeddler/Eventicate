"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Check, X, CreditCard } from "lucide-react";
import { CancellationRequest } from "@/components/bookings/CancellationRequest";

export function BookingActions({
  bookingId,
  status,
  hasBalance,
  hasPayments = false,
}: {
  bookingId: string;
  status: string;
  hasBalance?: boolean;
  hasPayments?: boolean;
}) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const payableStatuses = ["CONFIRMED", "DEPOSIT_PAID", "COMPLETED"];

  async function updateStatus(nextStatus: string) {
    setSubmitting(nextStatus);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-3">
        {payableStatuses.includes(status) && hasBalance && (
          <Link href={`/dashboard/checkout/${bookingId}`}>
            <Button variant="primary">
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Now
            </Button>
          </Link>
        )}
        {status === "QUOTATION_SENT" && (
          <>
            <Button
              variant="primary"
              disabled={submitting !== null}
              onClick={() => updateStatus("CONFIRMED")}
            >
              <Check className="mr-2 h-4 w-4" />
              Accept
            </Button>
            <Button
              variant="danger"
              disabled={submitting !== null}
              onClick={() => {
                if (!window.confirm("Reject this quotation? This cannot be undone.")) return;
                updateStatus("REJECTED");
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </>
        )}
        {status === "CONFIRMED" && !hasPayments && (
          <Button
            variant="danger"
            disabled={submitting !== null}
            onClick={() => {
              if (!window.confirm("Cancel this booking? This cannot be undone.")) return;
              updateStatus("CANCELLED");
            }}
          >
            Cancel Booking
          </Button>
        )}
      </div>
      {["CONFIRMED", "DEPOSIT_PAID"].includes(status) && (hasPayments || status === "DEPOSIT_PAID") && <CancellationRequest bookingId={bookingId} />}
      {error && <p className="text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>}
    </div>
  );
}
