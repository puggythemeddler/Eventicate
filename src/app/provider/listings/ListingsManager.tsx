"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { formatCurrency, parseJsonArray } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Pencil, Trash2, Plus, X } from "lucide-react";

type ListingType = "venue" | "vehicle" | "menuPackage" | "photoPackage";

interface Field {
  name: string;
  label: string;
  type: "text" | "number" | "textarea" | "select" | "checkbox";
  required?: boolean;
  min?: number;
  step?: string;
  options?: { value: string; label: string }[];
}

const TABS: { value: ListingType; label: string }[] = [
  { value: "venue", label: "Venues" },
  { value: "vehicle", label: "Vehicles" },
  { value: "menuPackage", label: "Menu Packages" },
  { value: "photoPackage", label: "Photo & Video" },
];

const FIELDS: Record<ListingType, Field[]> = {
  venue: [
    { name: "name", label: "Venue Name", type: "text", required: true },
    { name: "location", label: "Location", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "capacity", label: "Capacity", type: "number", required: true, min: 1 },
    { name: "basePrice", label: "Base Price", type: "number", required: true, min: 0, step: "0.01" },
    { name: "facilities", label: "Facilities (comma separated)", type: "text" },
  ],
  vehicle: [
    { name: "name", label: "Vehicle Name", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: [
      { value: "van", label: "Van" },
      { value: "truck", label: "Truck" },
      { value: "bus", label: "Bus" },
      { value: "delivery", label: "Delivery" },
      { value: "limo", label: "Limousine" },
      { value: "car", label: "Car" },
    ]},
    { name: "capacity", label: "Capacity", type: "number", required: true, min: 1 },
    { name: "basePrice", label: "Base Price", type: "number", required: true, min: 0, step: "0.01" },
    { name: "pricePerKm", label: "Price per KM", type: "number", min: 0, step: "0.01" },
    { name: "driverName", label: "Driver Name", type: "text" },
    { name: "driverPhone", label: "Driver Phone", type: "text" },
    { name: "description", label: "Description", type: "textarea" },
  ],
  menuPackage: [
    { name: "name", label: "Package Name", type: "text", required: true },
    { name: "servingStyle", label: "Serving Style", type: "select", required: true, options: [
      { value: "buffet", label: "Buffet" },
      { value: "plated", label: "Plated" },
      { value: "cocktail", label: "Cocktail" },
    ]},
    { name: "guestCount", label: "Guest Count", type: "number", required: true, min: 1 },
    { name: "basePrice", label: "Base Price", type: "number", required: true, min: 0, step: "0.01" },
    { name: "pricePerGuest", label: "Price per Guest", type: "number", min: 0, step: "0.01" },
    { name: "menuItems", label: "Menu Items (comma separated)", type: "text" },
    { name: "dietaryOptions", label: "Dietary Options (comma separated)", type: "text" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "includesDrinks", label: "Includes Drinks", type: "checkbox" },
    { name: "includesDessert", label: "Includes Dessert", type: "checkbox" },
  ],
  photoPackage: [
    { name: "name", label: "Package Name", type: "text", required: true },
    { name: "type", label: "Type", type: "select", required: true, options: [
      { value: "photography", label: "Photography" },
      { value: "videography", label: "Videography" },
      { value: "drone", label: "Drone" },
      { value: "editing", label: "Editing" },
      { value: "album", label: "Album" },
    ]},
    { name: "coverageHours", label: "Coverage Hours", type: "number", min: 1 },
    { name: "basePrice", label: "Base Price", type: "number", required: true, min: 0, step: "0.01" },
    { name: "description", label: "Description", type: "textarea" },
    { name: "includesEditing", label: "Includes Editing", type: "checkbox" },
    { name: "includesAlbum", label: "Includes Album", type: "checkbox" },
    { name: "includesDrone", label: "Includes Drone", type: "checkbox" },
  ],
};

const API_PATH: Record<ListingType, string> = {
  venue: "/api/venues",
  vehicle: "/api/vehicles",
  menuPackage: "/api/menu-packages",
  photoPackage: "/api/photo-packages",
};

const COLLECTION_KEY: Record<ListingType, string> = {
  venue: "venues",
  vehicle: "vehicles",
  menuPackage: "menuPackages",
  photoPackage: "photoPackages",
};

type Row = Record<string, unknown> & { id: string; isActive: boolean };

function commaToArray(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function listValue(row: Row, field: Field): string {
  const v = row[field.name];
  if (field.type === "checkbox") return "";
  if (field.name === "facilities") return parseJsonArray<string>(v as string).join(", ");
  if (field.name === "menuItems") return parseJsonArray<string>(v as string).join(", ");
  if (field.name === "dietaryOptions") return parseJsonArray<string>(v as string).join(", ");
  return v != null ? String(v) : "";
}

export function ListingsManager() {
  const [tab, setTab] = useState<ListingType>("venue");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);

  const fields = FIELDS[tab];
  const apiPath = API_PATH[tab];
  const collectionKey = COLLECTION_KEY[tab];

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiPath);
      if (!res.ok) throw new Error(`Failed to load (${res.status})`);
      const data = await res.json();
      setRows(data[collectionKey] || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tab]);

  function resetForm() {
    const initial: Record<string, string | boolean> = {};
    for (const f of fields) {
      initial[f.name] = f.type === "checkbox" ? false : "";
    }
    setForm(initial);
  }

  function startAdd() {
    resetForm();
    setEditingId(null);
    setAdding(true);
  }

  function startEdit(row: Row) {
    const initial: Record<string, string | boolean> = {};
    for (const f of fields) {
      initial[f.name] =
        f.type === "checkbox"
          ? Boolean(row[f.name])
          : listValue(row, f);
    }
    setForm(initial);
    setAdding(false);
    setEditingId(row.id);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.name];
      if (f.type === "checkbox") {
        body[f.name] = Boolean(v);
      } else if (f.type === "number") {
        body[f.name] = v === "" || v == null ? undefined : Number(v);
      } else if (f.name === "facilities" || f.name === "menuItems" || f.name === "dietaryOptions") {
        body[f.name] = commaToArray(String(v || ""));
      } else {
        body[f.name] = v === "" ? undefined : v;
      }
    }
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? apiPath : apiPath;
      const payload = editingId ? { ...body, id: editingId } : body;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.error) ? "Invalid form data" : data.error || `Failed to save (${res.status})`);
      setEditingId(null);
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save listing");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: Row) {
    setError(null);
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, isActive: !row.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update listing");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
    }
  }

  async function remove(row: Row) {
    if (!window.confirm(`Delete "${String(row.name)}" permanently?`)) return;
    setError(null);
    try {
      const res = await fetch(`${apiPath}?id=${row.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete listing");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete listing");
    }
  }

  const summary = useMemo(() => {
    return rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.isActive ? "active" : "inactive"] = (acc[r.isActive ? "active" : "inactive"] || 0) + 1;
      return acc;
    }, {});
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => { setTab(t.value); setEditingId(null); setAdding(false); }}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === t.value
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {rows.length} total · {summary.active || 0} active · {summary.inactive || 0} inactive
        </p>
        {!adding && (
          <Button onClick={startAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add {TABS.find((t) => t.value === tab)?.label.slice(0, -1)}
          </Button>
        )}
      </div>

      {adding && (
        <Card>
          <CardTitle className="mb-4">Add New</CardTitle>
          <ListingForm fields={fields} form={form} setForm={setForm} onCancel={() => setAdding(false)} onSubmit={submit} saving={saving} />
        </Card>
      )}

      {editingId && (
        <Card>
          <CardTitle className="mb-4">Edit</CardTitle>
          <ListingForm fields={fields} form={form} setForm={setForm} onCancel={() => setEditingId(null)} onSubmit={submit} saving={saving} />
        </Card>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">Loading...</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardTitle>No listings yet</CardTitle>
          <p className="mt-2 text-sm text-gray-500">Add your first {TABS.find((t) => t.value === tab)?.label.toLowerCase()} using the button above.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <Card key={row.id}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{String(row.name)}</h3>
                  <p className="text-xs text-gray-500">
                    {row.type ? `${String(row.type)} · ` : ""}
                    {formatCurrency(Number(row.basePrice || 0))}
                  </p>
                </div>
                <span className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  row.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
                )}>
                  {row.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              {row.description ? (
                <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                  {String(row.description)}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => startEdit(row)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleActive(row)}>
                  {row.isActive ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="danger" size="sm" onClick={() => remove(row)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ListingForm({
  fields,
  form,
  setForm,
  onCancel,
  onSubmit,
  saving,
}: {
  fields: Field[];
  form: Record<string, string | boolean>;
  setForm: (f: Record<string, string | boolean>) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => {
        const value = form[f.name];
        if (f.type === "checkbox") {
          return (
            <label key={f.name} className="flex cursor-pointer items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary-600"
                checked={Boolean(value)}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.checked })}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{f.label}</span>
            </label>
          );
        }
        if (f.type === "textarea") {
          return (
            <div key={f.name} className="sm:col-span-2">
              <Textarea
                label={f.label}
                value={String(value || "")}
                onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                rows={2}
              />
            </div>
          );
        }
        if (f.type === "select") {
          return (
            <Select
              key={f.name}
              label={f.label}
              required={f.required}
              value={String(value || "")}
              onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
              options={(f.options || []).map((o) => ({ value: o.value, label: o.label }))}
            />
          );
        }
        return (
          <Input
            key={f.name}
            label={f.label}
            required={f.required}
            type={f.type}
            min={f.min}
            step={f.step}
            value={String(value || "")}
            onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
          />
        );
      })}
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          <X className="mr-1.5 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  );
}