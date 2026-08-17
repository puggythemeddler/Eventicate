"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { Plus, X, FileText } from "lucide-react";

interface BookingOption {
  id: string;
  label: string;
}

interface CreateDocumentModalProps {
  bookings: BookingOption[];
}

export function CreateDocumentModal({ bookings }: CreateDocumentModalProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("quote");
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCreate() {
    if (!bookingId) { setError("Please select a booking"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/documents/generate?type=${type}&bookingId=${bookingId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create document");
      setOpen(false);
      setType("quote");
      setBookingId("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create document");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" /> Create Document
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-document-title"
        >
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span id="create-document-title">New Document</span>
              </CardTitle>
              <button type="button" aria-label="Close document dialog" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <Select
                label="Document Type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[
                  { value: "quote", label: "Quote" },
                  { value: "invoice", label: "Invoice" },
                ]}
              />
              <Select
                label="Booking"
                value={bookingId}
                onChange={(e) => { setBookingId(e.target.value); setError(""); }}
                options={[
                  { value: "", label: "Select a booking..." },
                  ...bookings.map((b) => ({ value: b.id, label: b.label })),
                ]}
              />

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={loading || !bookingId}>
                  {loading ? "Creating..." : `Generate ${type === "quote" ? "Quote" : "Invoice"}`}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
