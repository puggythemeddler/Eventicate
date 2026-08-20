"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { X } from "lucide-react";
import { ProductLocationFields } from "./ProductLocationFields";

const categoryOptions = SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }));

interface EditServiceModalProps {
  service: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    basePrice: number;
    discountPercent: number;
    locationCity: string | null;
    locationCountry: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}

export function EditServiceModal({ service, onClose, onSaved }: EditServiceModalProps) {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description || "");
  const [category, setCategory] = useState(service.category);
  const [basePrice, setBasePrice] = useState(service.basePrice);
  const [discountPercent, setDiscountPercent] = useState(service.discountPercent);
  const [locationCountry, setLocationCountry] = useState(service.locationCountry || "");
  const [locationCity, setLocationCity] = useState(service.locationCity || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: service.id,
          name,
          description: description || undefined,
          category,
          basePrice: Number(basePrice),
          discountPercent: Number(discountPercent) || 0,
          locationCity: locationCity || undefined,
          locationCountry: locationCountry || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(Array.isArray(data.error) ? "Invalid form data" : data.error || "Failed to update service");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update service");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-charcoal-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-charcoal-900 dark:text-charcoal-100">Edit Service</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit service dialog"
            className="text-charcoal-400 hover:text-charcoal-600 dark:text-charcoal-500 dark:hover:text-charcoal-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Service Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Textarea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={categoryOptions} required />
          <ProductLocationFields
            country={locationCountry}
            city={locationCity}
            onChange={(l) => {
              setLocationCountry(l.country);
              setLocationCity(l.city);
            }}
          />
          <Input
            label="Base Price"
            type="number"
            step="0.01"
            min="0"
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value) || 0)}
            required
          />
          <Input
            label="Discount (%)"
            type="number"
            min="0"
            max="100"
            value={discountPercent}
            onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
          />
          {error && <p className="text-sm text-terracotta-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}