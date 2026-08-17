"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { EQUIPMENT_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Plus, X } from "lucide-react";
import Image from "next/image";

const categoryOptions = [
  { value: "", label: "Select category..." },
  ...Object.keys(EQUIPMENT_CATEGORIES).map((key) => ({
    value: key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
  })),
];

export function AddEquipmentForm() {
  const currency = useCurrency();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [rentalPrice, setRentalPrice] = useState(0);

  const discountedPrice = rentalPrice * (100 - discountPercent) / 100;

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
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    const imageUrls: string[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload?type=equipment", { method: "POST", body: fd });
      if (res.ok) {
        const data = await res.json();
        imageUrls.push(data.url);
      }
    }

    const res = await fetch("/api/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        category: formData.get("category"),
        subcategory: formData.get("subcategory"),
        quantity: Number(formData.get("quantity")) || 1,
        condition: formData.get("condition") || "good",
        description: formData.get("description"),
        rentalPrice: Number(formData.get("rentalPrice")) || 0,
        discountPercent: Number(formData.get("discountPercent")) || 0,
        setupCharge: Number(formData.get("setupCharge")) || 0,
        transportCharge: Number(formData.get("transportCharge")) || 0,
        operatorCharge: Number(formData.get("operatorCharge")) || 0,
        images: imageUrls,
      }),
    });
    if (res.ok) window.location.reload();
    setUploading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input label="Equipment Name" name="name" required placeholder="e.g. JBL SRX835" />
      <Select label="Category" name="category" options={categoryOptions} required />
      <Input label="Subcategory" name="subcategory" required placeholder="e.g. Speakers" />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Quantity" name="quantity" type="number" min="1" defaultValue="1" />
        <Input label="Condition" name="condition" defaultValue="good" placeholder="good, excellent, fair" />
      </div>
      <Textarea label="Description" name="description" rows={2} />
      <Input label="Rental Price ($)" name="rentalPrice" type="number" step="0.01" min="0" required onChange={(e) => setRentalPrice(Number(e.target.value) || 0)} />
      <Input label="Discount (%)" name="discountPercent" type="number" min="0" max="100" value={discountPercent} onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} />
      {discountPercent > 0 && (
        <p className="text-sm text-gray-500">
          Discounted price: <span className="font-semibold text-primary-600">{formatCurrency(discountedPrice, currency)}</span>
          <span className="ml-2 text-xs text-green-600">({discountPercent}% off)</span>
        </p>
      )}
      <div className="grid grid-cols-3 gap-3">
        <Input label="Setup ($)" name="setupCharge" type="number" step="0.01" min="0" defaultValue="0" />
        <Input label="Transport ($)" name="transportCharge" type="number" step="0.01" min="0" defaultValue="0" />
        <Input label="Operator ($)" name="operatorCharge" type="number" step="0.01" min="0" defaultValue="0" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Images</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="block w-full text-sm text-gray-500 file:mr-2 file:rounded file:border-0 file:bg-primary-50 file:px-2 file:py-1 file:text-sm file:font-medium file:text-primary-700 dark:file:bg-primary-900/30 dark:file:text-primary-300"
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
                  className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button type="submit" disabled={uploading} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        {uploading ? "Uploading..." : "Add Equipment"}
      </Button>
    </form>
  );
}
