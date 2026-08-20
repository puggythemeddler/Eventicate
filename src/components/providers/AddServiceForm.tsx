"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Plus, X } from "lucide-react";
import Image from "next/image";
import { ProductLocationFields } from "./ProductLocationFields";

const categoryOptions = SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }));

export function AddServiceForm({ defaultCity = "", defaultCountry = "" }: { defaultCity?: string; defaultCountry?: string }) {
  const currency = useCurrency();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [locationCountry, setLocationCountry] = useState(defaultCountry);
  const [locationCity, setLocationCity] = useState(defaultCity);
  const [error, setError] = useState<string | null>(null);

  const discountedPrice = basePrice * (100 - discountPercent) / 100;

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
    selected.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (result) setPreviews((prev) => [...prev, result as string]);
      };
      reader.readAsDataURL(f);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError(null);
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const imageUrls: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload?type=services", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        imageUrls.push(data.url);
      }
    }

    const res = await fetch("/api/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        description: formData.get("description"),
        category: formData.get("category"),
        basePrice: Number(formData.get("basePrice")),
        discountPercent: Number(formData.get("discountPercent")) || 0,
        locationCity: locationCity || undefined,
        locationCountry: locationCountry || undefined,
        images: imageUrls,
      }),
    });
    if (res.ok) {
      window.location.reload();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setError(Array.isArray(data.error) ? "Invalid form data. Please check your inputs." : data.error || "Failed to add service");
    setUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Service Name" name="name" required placeholder="e.g. Premium Sound System" />
      <Textarea label="Description" name="description" rows={2} placeholder="Describe what this service includes..." />
      <Select label="Category" name="category" options={categoryOptions} required />
      <ProductLocationFields
        country={locationCountry}
        city={locationCity}
        onChange={(l) => {
          setLocationCountry(l.country);
          setLocationCity(l.city);
        }}
      />
      <Input label="Base Price" name="basePrice" type="number" step="0.01" min="0" required onChange={(e) => setBasePrice(Number(e.target.value) || 0)} />
      <Input label="Discount (%)" name="discountPercent" type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
      {discountPercent > 0 && (
        <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
          Discounted price: <span className="font-semibold text-primary-600">{formatCurrency(discountedPrice, currency)}</span>
          <span className="ml-2 text-xs text-olive-600 dark:text-olive-400">({discountPercent}% off)</span>
        </p>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-charcoal-700 dark:text-charcoal-200">Images</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="block w-full text-sm text-charcoal-500 dark:text-charcoal-400 file:mr-2 file:rounded file:border-0 file:bg-primary-50 file:px-2 file:py-1 file:text-sm file:font-medium file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300"
        />
        {previews.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative">
                <Image
                  src={src}
                  alt="Preview"
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label="Remove image"
                  className="absolute -right-1 -top-1 rounded-full bg-terracotta-600 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-terracotta-600">{error}</p>}
      <Button type="submit" disabled={uploading} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        {uploading ? "Uploading..." : "Add Service"}
      </Button>
    </form>
  );
}
