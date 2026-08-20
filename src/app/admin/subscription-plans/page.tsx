"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  trialDays: number;
  maxServices: number;
  maxEquipment: number;
  maxBookings: number;
  maxVenues: number;
  maxVehicles: number;
  features: string;
  isActive: boolean;
  sortOrder: number;
}

interface FormData {
  name: string;
  description: string;
  price: number;
  trialDays: number;
  maxServices: number;
  maxEquipment: number;
  maxBookings: number;
  maxVenues: number;
  maxVehicles: number;
  features: string;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm: FormData = {
  name: "",
  description: "",
  price: 0,
  trialDays: 0,
  maxServices: 5,
  maxEquipment: 10,
  maxBookings: 50,
  maxVenues: 1,
  maxVehicles: 1,
  features: "[]",
  isActive: true,
  sortOrder: 0,
};

export default function SubscriptionPlansPage() {
  const currency = useCurrency();
  const [authorized, setAuthorized] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/subscription-plans");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setPlans(data.plans || []);
      setLoadError(null);
    } catch {
      setLoadError("Unable to load subscription plans. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/session");
      const { user } = await res.json();
      if (!user || user.role !== "ADMIN") {
        router.push("/auth/login");
        return;
      }
      setAuthorized(true);
      await fetchPlans();
      setLoading(false);
    })();
  }, [router, fetchPlans]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setActionError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/subscription-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to create plan (${res.status})`);
      }
      setShowCreate(false);
      setForm(emptyForm);
      setSuccess("Plan created.");
      fetchPlans();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create plan. Please try again.");
    }
  }

  async function handleUpdate(id: string) {
    setActionError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/subscription-plans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...form }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to update plan (${res.status})`);
      }
      setEditingId(null);
      setForm(emptyForm);
      setSuccess("Plan updated.");
      fetchPlans();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update plan. Please try again.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    setActionError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/admin/subscription-plans?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to delete plan (${res.status})`);
      }
      setSuccess("Plan deleted.");
      fetchPlans();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete plan. Please try again.");
    }
  }

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setSuccess(null);
    setActionError(null);
    setForm({
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      trialDays: plan.trialDays,
      maxServices: plan.maxServices,
      maxEquipment: plan.maxEquipment,
      maxBookings: plan.maxBookings,
      maxVenues: plan.maxVenues,
      maxVehicles: plan.maxVehicles,
      features: plan.features,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="ADMIN" />
        <PageContent>
          <Card className="animate-pulse p-6">
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Loading subscription plans…</p>
          </Card>
        </PageContent>
      </div>
    );
  }

  if (!authorized) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="ADMIN" />
      <PageContent>
          {loadError && (
            <Card className="mb-6 border-terracotta-200 bg-terracotta-50 dark:border-terracotta-900 dark:bg-terracotta-950/30">
              <p className="text-sm text-terracotta-700 dark:text-terracotta-300">{loadError}</p>
              <div className="mt-3">
                <Button variant="outline" onClick={() => { setLoadError(null); fetchPlans(); }}>Retry</Button>
              </div>
            </Card>
          )}
          {actionError && (
            <Card className="mb-6 border-terracotta-200 bg-terracotta-50 dark:border-terracotta-900 dark:bg-terracotta-950/30">
              <p className="text-sm text-terracotta-700 dark:text-terracotta-300">{actionError}</p>
            </Card>
          )}
          {success && (
            <Card className="mb-6 border-olive-200 bg-olive-50 dark:border-olive-900 dark:bg-olive-950/30">
              <p className="text-sm text-olive-700 dark:text-olive-300">{success}</p>
            </Card>
          )}
          <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Subscription Plans</h1>
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
              Manage subscription tiers and pricing
            </p>
          </div>
          <Button onClick={() => { setShowCreate(!showCreate); setEditingId(null); setForm(emptyForm); setSuccess(null); setActionError(null); }}>
            <Plus className="mr-1 h-4 w-4" /> New Plan
          </Button>
        </div>

        {showCreate && (
          <Card className="mb-6 border-primary-200">
            <form onSubmit={handleCreate} className="space-y-4">
              <CardTitle>Create New Plan</CardTitle>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Plan Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <Input label="Price (per month)" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
                <Input label="Trial Days" type="number" min="0" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: parseInt(e.target.value) || 0 })} />
                <Input label="Sort Order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
                <Input label="Max Services (-1 = unlimited)" type="number" min="-1" value={form.maxServices} onChange={(e) => setForm({ ...form, maxServices: parseInt(e.target.value) || 0 })} />
                <Input label="Max Equipment (-1 = unlimited)" type="number" min="-1" value={form.maxEquipment} onChange={(e) => setForm({ ...form, maxEquipment: parseInt(e.target.value) || 0 })} />
                <Input label="Max Bookings (-1 = unlimited)" type="number" min="-1" value={form.maxBookings} onChange={(e) => setForm({ ...form, maxBookings: parseInt(e.target.value) || 0 })} />
                <Input label="Max Venues (-1 = unlimited)" type="number" min="-1" value={form.maxVenues} onChange={(e) => setForm({ ...form, maxVenues: parseInt(e.target.value) || 0 })} />
                <Input label="Max Vehicles (-1 = unlimited)" type="number" min="-1" value={form.maxVehicles} onChange={(e) => setForm({ ...form, maxVehicles: parseInt(e.target.value) || 0 })} />
              </div>
              <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-charcoal-700 dark:text-charcoal-200">Features (JSON array)</label>
                <textarea value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })}
                  className="w-full rounded-lg border border-charcoal-300 dark:border-charcoal-700 px-3 py-2 text-sm font-mono dark:bg-charcoal-800 dark:text-charcoal-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" rows={3} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                Active
              </label>
              <div className="flex gap-2">
                <Button type="submit">Create Plan</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-charcoal-500 dark:text-charcoal-400">
                  <th className="pb-3 pr-4">Sort</th>
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 pr-4">Price</th>
                  <th className="pb-3 pr-4">Trial</th>
                  <th className="pb-3 pr-4">Services</th>
                  <th className="pb-3 pr-4">Equipment</th>
                  <th className="pb-3 pr-4">Bookings</th>
                  <th className="pb-3 pr-4">Active</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="border-b border-charcoal-100 dark:border-charcoal-800">
                    {editingId === plan.id ? (
                      <>
                        <td className="py-3 pr-4">
                          <input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
                            className="w-16 rounded border px-2 py-1 text-xs dark:border-charcoal-700 dark:bg-charcoal-800" />
                        </td>
                        <td className="py-3 pr-4">
                          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-32 rounded border px-2 py-1 text-xs dark:border-charcoal-700 dark:bg-charcoal-800" />
                        </td>
                        <td className="py-3 pr-4">
                          <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                            className="w-20 rounded border px-2 py-1 text-xs dark:border-charcoal-700 dark:bg-charcoal-800" />
                        </td>
                        <td className="py-3 pr-4">
                          <input type="number" min="0" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: parseInt(e.target.value) || 0 })}
                            className="w-16 rounded border px-2 py-1 text-xs dark:border-charcoal-700 dark:bg-charcoal-800" />
                        </td>
                        <td className="py-3 pr-4">
                          <input type="number" min="-1" value={form.maxServices} onChange={(e) => setForm({ ...form, maxServices: parseInt(e.target.value) || 0 })}
                            className="w-16 rounded border px-2 py-1 text-xs dark:border-charcoal-700 dark:bg-charcoal-800" />
                        </td>
                        <td className="py-3 pr-4">
                          <input type="number" min="-1" value={form.maxEquipment} onChange={(e) => setForm({ ...form, maxEquipment: parseInt(e.target.value) || 0 })}
                            className="w-16 rounded border px-2 py-1 text-xs dark:border-charcoal-700 dark:bg-charcoal-800" />
                        </td>
                        <td className="py-3 pr-4">
                          <input type="number" min="-1" value={form.maxBookings} onChange={(e) => setForm({ ...form, maxBookings: parseInt(e.target.value) || 0 })}
                            className="w-16 rounded border px-2 py-1 text-xs dark:border-charcoal-700 dark:bg-charcoal-800" />
                        </td>
                        <td className="py-3 pr-4">
                          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <button onClick={() => handleUpdate(plan.id)} aria-label="Save changes" className="rounded p-1 text-olive-700 dark:text-olive-400 hover:bg-olive-50"><Check className="h-4 w-4" /></button>
                            <button type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }} aria-label="Cancel editing" className="rounded p-1 text-charcoal-600 dark:text-charcoal-300 hover:bg-sand dark:hover:bg-charcoal-800"><X className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 pr-4">{plan.sortOrder}</td>
                        <td className="py-3 pr-4 font-medium">{plan.name}</td>
                        <td className="py-3 pr-4">{plan.price === 0 ? "Free" : formatCurrency(plan.price, currency)}</td>
                        <td className="py-3 pr-4">{plan.trialDays > 0 ? `${plan.trialDays}d` : "\u2014"}</td>
                        <td className="py-3 pr-4">{plan.maxServices === -1 ? "\u221E" : plan.maxServices}</td>
                        <td className="py-3 pr-4">{plan.maxEquipment === -1 ? "\u221E" : plan.maxEquipment}</td>
                        <td className="py-3 pr-4">{plan.maxBookings === -1 ? "\u221E" : plan.maxBookings}</td>
                        <td className="py-3 pr-4">
                          <span className={`inline-block h-2 w-2 rounded-full ${plan.isActive ? "bg-olive-600" : "bg-terracotta-600"}`} />
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1">
                            <button type="button" onClick={() => startEdit(plan)} aria-label={`Edit ${plan.name}`} className="rounded p-1 text-primary-700 dark:text-primary-400 hover:bg-primary-50"><Pencil className="h-4 w-4" /></button>
                            <button type="button" onClick={() => handleDelete(plan.id)} aria-label={`Delete ${plan.name}`} className="rounded p-1 text-terracotta-700 dark:text-terracotta-400 hover:bg-terracotta-50"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </PageContent>
    </div>
  );
}
