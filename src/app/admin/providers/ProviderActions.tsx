"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";
import { Loader2, Pencil, Trash2, X, CheckCircle, Ban, RotateCcw, ShieldCheck, ShieldX } from "lucide-react";
import { SERVICE_CATEGORIES } from "@/lib/constants";

interface EditableProvider {
  id: string;
  businessName: string;
  category: string;
  description: string | null;
  city: string | null;
  country: string | null;
  isApproved: boolean;
  isActive: boolean;
  verificationStatus: string;
  verificationDocuments: string;
  verificationNote: string | null;
  user: { firstName: string; lastName: string; email: string; phone: string | null };
}

export function VerifyProviderButton({ provider }: { provider: EditableProvider }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function decide(status: "VERIFIED" | "REJECTED") {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}/verification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update verification");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update verification");
    } finally {
      setSaving(false);
    }
  }

  const docs = (() => {
    try {
      return JSON.parse(provider.verificationDocuments || "[]") as string[];
    } catch {
      return [] as string[];
    }
  })();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={provider.verificationStatus !== "PENDING" && provider.verificationStatus !== "REJECTED"}
        aria-label={`Verify ${provider.businessName}`}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-provider-title"
        >
          <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <CardTitle><span id="verify-provider-title">Review Verification — {provider.businessName}</span></CardTitle>
              <button type="button" onClick={() => setOpen(false)} className="text-charcoal-400 hover:text-charcoal-600 dark:text-charcoal-500 dark:hover:text-charcoal-300" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-2 text-sm font-medium text-charcoal-700 dark:text-charcoal-200">
              Submitted documents
            </p>
            {docs.length === 0 ? (
              <p className="mb-4 text-sm text-charcoal-500 dark:text-charcoal-400">No documents submitted.</p>
            ) : (
              <ul className="mb-4 space-y-1.5">
                {docs.map((url, i) => (
                  <li key={i}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary-600 underline hover:text-primary-700"
                    >
                      {url.split("/").pop() || url}
                    </a>
                  </li>
                ))}
              </ul>
            )}

            {provider.verificationNote && (
              <p className="mb-3 text-sm text-charcoal-600 dark:text-charcoal-300">
                Previous note: {provider.verificationNote}
              </p>
            )}

            <Textarea
              label="Note to provider"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Reason for rejection or a note to the provider..."
            />

            {error && <p className="mt-3 text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => decide("REJECTED")} disabled={saving}>
                <ShieldX className="mr-1 h-4 w-4" />
                {saving ? "Saving..." : "Reject"}
              </Button>
              <Button onClick={() => decide("VERIFIED")} disabled={saving}>
                <ShieldCheck className="mr-1 h-4 w-4" />
                {saving ? "Saving..." : "Approve"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export function EditProviderButton({ provider }: { provider: EditableProvider }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: provider.user.firstName,
    lastName: provider.user.lastName,
    phone: provider.user.phone || "",
    businessName: provider.businessName,
    category: provider.category,
    description: provider.description || "",
    city: provider.city || "",
    country: provider.country || "",
    isApproved: provider.isApproved,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof typeof form, value: string | boolean) => {
    setSaved(false);
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.error) ? data.error[0]?.message : data.error;
        throw new Error(msg || "Failed to update provider");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update provider");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={`Edit ${provider.businessName}`}>
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-provider-title"
        >
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <CardTitle><span id="edit-provider-title">Edit Provider</span></CardTitle>
              <button
                type="button"
                aria-label="Close edit provider dialog"
                onClick={() => {
                  setOpen(false);
                  setError("");
                  setSaved(false);
                }}
                className="text-charcoal-400 hover:text-charcoal-600 dark:text-charcoal-500 dark:hover:text-charcoal-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="First Name" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} />
                <Input label="Last Name" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                <Select
                  label="Category"
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  options={SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                />
              </div>

              <Input label="Business Name" value={form.businessName} onChange={(e) => update("businessName", e.target.value)} />

              <Textarea
                label="Description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="City" value={form.city} onChange={(e) => update("city", e.target.value)} />
                <Input label="Country" value={form.country} onChange={(e) => update("country", e.target.value)} />
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-charcoal-700 dark:text-charcoal-200">
                <input
                  type="checkbox"
                  checked={form.isApproved}
                  onChange={(e) => update("isApproved", e.target.checked)}
                  className="h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500 dark:border-charcoal-700"
                />
                Approved
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>}
            {saved && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-olive-700 dark:text-olive-400">
                <CheckCircle className="h-4 w-4" />
                Saved
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-1 h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export function DeactivateButton({ provider }: { provider: EditableProvider }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !provider.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      router.refresh();
    } catch {
      alert("Failed to update provider status");
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button size="sm" onClick={handle} disabled={loading}>
          {loading ? "..." : "Confirm"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirm(false)}>No</Button>
      </span>
    );
  }

  return provider.isActive ? (
    <Button variant="danger" size="sm" onClick={() => setConfirm(true)} disabled={loading} aria-label={`Deactivate ${provider.businessName}`}>
      <Ban className="h-3.5 w-3.5" />
    </Button>
  ) : (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading} aria-label={`Reactivate ${provider.businessName}`}>
      <RotateCcw className="h-3.5 w-3.5" />
    </Button>
  );
}

export function DeleteProviderButton({ provider }: { provider: EditableProvider }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");

  const handle = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/providers/${provider.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete provider");
      }
      router.refresh();
      setConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete provider");
      setConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button size="sm" variant="danger" onClick={handle} disabled={loading}>
          {loading ? "..." : "Delete"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setConfirm(false)}>No</Button>
      </span>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setConfirm(true)}
      disabled={loading}
      aria-label={`Delete ${provider.businessName}`}
    >
      <Trash2 className="h-3.5 w-3.5 text-terracotta-600 dark:text-terracotta-400" />
    </Button>
  );
}