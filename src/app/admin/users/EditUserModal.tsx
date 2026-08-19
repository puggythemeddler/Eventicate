"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { X } from "lucide-react";

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
}

interface EditUserModalProps {
  user: UserRow;
  isSelf: boolean;
  onClose: () => void;
}

const ROLE_OPTIONS = [
  { value: "CUSTOMER", label: "Customer" },
  { value: "PROVIDER", label: "Provider" },
  { value: "ADMIN", label: "Admin" },
];

export function EditUserModal({ user, isSelf, onClose }: EditUserModalProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? "",
    role: user.role,
    isActive: user.isActive,
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const body: Record<string, unknown> = { userId: user.id };
    if (form.firstName.trim()) body.firstName = form.firstName.trim();
    if (form.lastName.trim()) body.lastName = form.lastName.trim();
    if (form.email.trim()) body.email = form.email.trim();
    body.phone = form.phone.trim() || null;
    body.role = form.role;
    body.isActive = form.isActive;
    if (form.password) body.password = form.password;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(data.error) ? "Invalid form data" : data.error;
        throw new Error(typeof msg === "string" ? msg : "Failed to update user");
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-charcoal-200 bg-white shadow-xl dark:border-charcoal-700 dark:bg-charcoal-900">
        <div className="flex items-center justify-between border-b border-charcoal-100 px-5 py-4 dark:border-charcoal-800">
          <h2 className="font-display text-lg font-semibold text-charcoal-900 dark:text-charcoal-100">Edit User</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1 text-charcoal-500 hover:bg-sand dark:text-charcoal-400 dark:hover:bg-charcoal-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-lg bg-terracotta-50 p-3 text-sm text-terracotta-700 dark:bg-terracotta-900/30 dark:text-terracotta-400">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </div>
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="+254700000000"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Role"
              value={form.role}
              disabled={isSelf}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              options={ROLE_OPTIONS}
            />
            <Select
              label="Status"
              value={form.isActive ? "active" : "inactive"}
              disabled={isSelf}
              onChange={(e) => setForm({ ...form, isActive: e.target.value === "active" })}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
          <Input
            label="New Password (optional — reset the user's password)"
            type="password"
            placeholder="Leave blank to keep current password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
          />
          {isSelf && (
            <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
              You cannot change your own role or deactivate your own account.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}