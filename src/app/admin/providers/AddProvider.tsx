"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Card, CardTitle } from "@/components/ui/Card";
import { Loader2, Plus, X, CheckCircle } from "lucide-react";
import { SERVICE_CATEGORIES } from "@/lib/constants";

interface FormState {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  businessName: string;
  category: string;
  description: string;
  city: string;
  country: string;
  isApproved: boolean;
}

const initial: FormState = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
  businessName: "",
  category: "OTHER",
  description: "",
  city: "",
  country: "",
  isApproved: true,
};

export function AddProviderButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const update = (key: keyof FormState, value: string | boolean) => {
    setSaved(false);
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.error) ? data.error[0]?.message : data.error;
        throw new Error(msg || "Failed to create provider");
      }
      setSaved(true);
      setForm(initial);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create provider");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-1 h-4 w-4" />
        Add Provider
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-provider-title"
        >
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <CardTitle><span id="add-provider-title">Add Provider Manually</span></CardTitle>
              <button
                type="button"
                aria-label="Close add provider dialog"
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
                <Input
                  label="First Name"
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  placeholder="John"
                />
                <Input
                  label="Last Name"
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  placeholder="Doe"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="provider@business.com"
                />
                <Input
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Phone"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+254712345678"
                />
                <Select
                  label="Category"
                  value={form.category}
                  onChange={(e) => update("category", e.target.value)}
                  options={SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                />
              </div>

              <Input
                label="Business Name"
                value={form.businessName}
                onChange={(e) => update("businessName", e.target.value)}
                placeholder="Doe Events Ltd."
              />

              <Textarea
                label="Description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                placeholder="Short description of their services"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="City"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                  placeholder="Nairobi"
                />
                <Input
                  label="Country"
                  value={form.country}
                  onChange={(e) => update("country", e.target.value)}
                  placeholder="Kenya"
                />
              </div>

              <label className="flex items-center gap-2 text-sm font-medium text-charcoal-700 dark:text-charcoal-200">
                <input
                  type="checkbox"
                  checked={form.isApproved}
                  onChange={(e) => update("isApproved", e.target.checked)}
                  className="h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500 dark:border-charcoal-700"
                />
                Approved on sign-up
              </label>
            </div>

            {error && <p className="mt-3 text-sm text-terracotta-700 dark:text-terracotta-400">{error}</p>}
            {saved && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-olive-700 dark:text-olive-400">
                <CheckCircle className="h-4 w-4" />
                Provider created
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                Create Provider
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}