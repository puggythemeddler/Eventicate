"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { EQUIPMENT_CATEGORIES } from "@/lib/constants";
import { parseJsonArray } from "@/lib/utils";
import { X } from "lucide-react";
import { ProductLocationFields } from "./ProductLocationFields";
import { ImageUploader } from "./ImageUploader";

const categoryOptions = [
  { value: "", label: "Select category..." },
  ...Object.keys(EQUIPMENT_CATEGORIES).map((key) => ({
    value: key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
  })),
];

interface EditEquipmentModalProps {
  item: {
    id: string;
    name: string;
    category: string;
    subcategory: string;
    quantity: number;
    condition: string;
    description: string | null;
    rentalPrice: number;
    discountPercent: number;
    setupCharge: number;
    transportCharge: number;
    operatorCharge: number;
    locationCity: string | null;
    locationCountry: string | null;
    images: string;
  };
  onClose: () => void;
  onSaved: () => void;
}

export function EditEquipmentModal({ item, onClose, onSaved }: EditEquipmentModalProps) {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [subcategory, setSubcategory] = useState(item.subcategory);
  const [quantity, setQuantity] = useState(item.quantity);
  const [condition, setCondition] = useState(item.condition);
  const [description, setDescription] = useState(item.description || "");
  const [rentalPrice, setRentalPrice] = useState(item.rentalPrice);
  const [discountPercent, setDiscountPercent] = useState(item.discountPercent);
  const [setupCharge, setSetupCharge] = useState(item.setupCharge);
  const [transportCharge, setTransportCharge] = useState(item.transportCharge);
  const [operatorCharge, setOperatorCharge] = useState(item.operatorCharge);
  const [locationCountry, setLocationCountry] = useState(item.locationCountry || "");
  const [locationCity, setLocationCity] = useState(item.locationCity || "");
  const [images, setImages] = useState<string[]>(() => parseJsonArray<string>(item.images));
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
      const res = await fetch("/api/equipment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          name,
          category,
          subcategory,
          quantity: Number(quantity) || 1,
          condition,
          description: description || undefined,
          rentalPrice: Number(rentalPrice) || 0,
          discountPercent: Number(discountPercent) || 0,
          setupCharge: Number(setupCharge) || 0,
          transportCharge: Number(transportCharge) || 0,
          operatorCharge: Number(operatorCharge) || 0,
          locationCity: locationCity || undefined,
          locationCountry: locationCountry || undefined,
          images,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(Array.isArray(data.error) ? "Invalid form data" : data.error || "Failed to update equipment");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update equipment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-charcoal-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-charcoal-900 dark:text-charcoal-100">Edit Equipment</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit equipment dialog"
            className="text-charcoal-400 hover:text-charcoal-600 dark:text-charcoal-500 dark:hover:text-charcoal-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Equipment Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={categoryOptions} required />
          <Input label="Subcategory" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Quantity" type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 1)} />
            <Input label="Condition" value={condition} onChange={(e) => setCondition(e.target.value)} />
          </div>
          <Textarea label="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          <ProductLocationFields
            country={locationCountry}
            city={locationCity}
            onChange={(l) => {
              setLocationCountry(l.country);
              setLocationCity(l.city);
            }}
          />
          <Input
            label="Rental Price"
            type="number"
            step="0.01"
            min="0"
            value={rentalPrice}
            onChange={(e) => setRentalPrice(Number(e.target.value) || 0)}
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
          <div className="grid grid-cols-3 gap-3">
            <Input label="Setup" type="number" step="0.01" min="0" value={setupCharge} onChange={(e) => setSetupCharge(Number(e.target.value) || 0)} />
            <Input label="Transport" type="number" step="0.01" min="0" value={transportCharge} onChange={(e) => setTransportCharge(Number(e.target.value) || 0)} />
            <Input label="Operator" type="number" step="0.01" min="0" value={operatorCharge} onChange={(e) => setOperatorCharge(Number(e.target.value) || 0)} />
          </div>
          <ImageUploader type="equipment" label="Images" value={images} onChange={setImages} />
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