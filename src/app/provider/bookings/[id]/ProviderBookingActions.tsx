"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

export function ProviderBookingActions({ bookingId, status }: { bookingId: string; status: string }) {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(payload: Record<string, unknown>) {
    setSubmitting(JSON.stringify(payload.status));
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  async function handleSendQuotation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const quotedPrice = Number(formData.get("quotedPrice"));
    if (!quotedPrice || quotedPrice <= 0) {
      setError("Please enter a valid quoted price.");
      return;
    }
    await updateStatus({
      status: "QUOTATION_SENT",
      quotedPrice,
      providerNotes: formData.get("providerNotes") || undefined,
    });
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    await updateStatus({
      status: "CONFIRMED",
      depositAmount: Number(formData.get("depositAmount")) || undefined,
    });
  }

  return (
    <div className="flex flex-col items-start gap-3">
      {status === "QUOTATION_REQUESTED" && (
        <form
          onSubmit={handleSendQuotation}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-charcoal-200 bg-sand p-4 dark:border-charcoal-800 dark:bg-charcoal-800"
        >
          <Input
            label="Quoted Price"
            name="quotedPrice"
            type="number"
            step="0.01"
            min="0"
            required
            className="w-40"
          />
          <Textarea
            label="Provider Notes"
            name="providerNotes"
            rows={2}
            className="w-64"
            placeholder="Terms, details..."
          />
          <Button type="submit" variant="primary" disabled={submitting !== null}>
            Send Quotation
          </Button>
        </form>
      )}
      {status === "PENDING_APPROVAL" && (
        <div className="flex flex-wrap items-end gap-3">
          <form onSubmit={handleConfirm} className="flex flex-wrap items-end gap-3">
            <Input
              label="Deposit Amount"
              name="depositAmount"
              type="number"
              step="0.01"
              min="0"
              className="w-40"
            />
            <Button type="submit" variant="primary" disabled={submitting !== null}>
              Confirm Booking
            </Button>
          </form>
          <Button
            variant="danger"
            disabled={submitting !== null}
            onClick={() => updateStatus({ status: "REJECTED" })}
          >
            Reject
          </Button>
        </div>
      )}
      {status === "CONFIRMED" && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={submitting !== null}
            onClick={() => updateStatus({ status: "COMPLETED" })}
          >
            Complete
          </Button>
          <Button
            variant="danger"
            disabled={submitting !== null}
            onClick={() => updateStatus({ status: "CANCELLED" })}
          >
            Cancel
          </Button>
        </div>
      )}
      {status === "DEPOSIT_PAID" && (
        <Button
          variant="primary"
          disabled={submitting !== null}
          onClick={() => updateStatus({ status: "COMPLETED" })}
        >
          Complete Booking
        </Button>
      )}
      {error && <p className="text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>}
    </div>
  );
}

export function ProviderNotesForm({
  bookingId,
  providerNotes,
}: {
  bookingId: string;
  providerNotes: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerNotes: formData.get("providerNotes") }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save notes.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        label="Provider Notes"
        name="providerNotes"
        defaultValue={providerNotes || ""}
        rows={3}
        placeholder="Internal notes about this booking..."
      />
      <Button type="submit" variant="outline" size="sm" disabled={saving}>
        Save Notes
      </Button>
      {error && <p className="text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>}
    </form>
  );
}

export function DocumentActions({ bookingId }: { bookingId: string }) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(type: string) {
    setGenerating(type);
    setError(null);
    try {
      const res = await fetch(`/api/documents/generate?type=${type}&bookingId=${bookingId}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to generate document.");
        return;
      }
      window.location.reload();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={generating !== null}
          onClick={() => generate("proforma")}
        >
          Generate Proforma Invoice
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={generating !== null}
          onClick={() => generate("tax-invoice")}
        >
          Generate Tax Invoice
        </Button>
      </div>
      {error && <p className="text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>}
    </div>
  );
}
