"use client";

import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { SERVICE_CATEGORIES, EVENT_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Tag } from "lucide-react";
import { CardTitle, Card } from "@/components/ui/Card";

const categoryOptions = SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }));

interface SettingsFormProps {
  provider: {
    id: string;
    businessName: string;
    description: string | null;
    category: string;
    address: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    website: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    travelOutsideArea: boolean;
    travelRadius: number | null;
    defaultDiscount: number;
    applyDiscountToAll: boolean;
  };
  countryOptions: { value: string; label: string }[];
  allSubdivisions: { value: string; label: string }[];
  pricingRules: {
    id: string;
    name: string;
    eventType: string | null;
    isWeekend: boolean;
    isPeakSeason: boolean;
    priceModifier: number;
    modifierType: string;
  }[];
  currentServices: { basePrice: number; discountPercent: number }[];
}

export function SettingsForm({
  provider, countryOptions, allSubdivisions, pricingRules, currentServices,
}: SettingsFormProps) {
  const currency = useCurrency();
  const discountedServicesCount = currentServices.filter((s) => s.discountPercent > 0).length;

  async function handleBusinessSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const res = await fetch("/api/provider/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessName: formData.get("businessName"),
        description: formData.get("description") || undefined,
        category: formData.get("category"),
        address: formData.get("address") || undefined,
        city: formData.get("city") || undefined,
        country: formData.get("country") || undefined,
        phone: formData.get("phone") || undefined,
        website: formData.get("website") || undefined,
        logoUrl: formData.get("logoUrl") || undefined,
        coverImageUrl: formData.get("coverImageUrl") || undefined,
        travelOutsideArea: formData.get("travelOutsideArea") === "on",
        travelRadius: formData.get("travelRadius") ? Number(formData.get("travelRadius")) : null,
      }),
    });
    if (res.ok) alert("Settings saved successfully!");
  }

  async function handlePricingSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const defaultDiscount = Number(formData.get("defaultDiscount")) || 0;
    const applyToAll = formData.get("applyDiscountToAll") === "on";

    if (applyToAll) {
      const res = await fetch("/api/services/bulk-discount", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountPercent: defaultDiscount }),
      });
      if (!res.ok) return alert("Failed to apply discount to all services");
    }

    const res = await fetch("/api/provider/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultDiscount, applyDiscountToAll: applyToAll }),
    });
    if (res.ok) {
      alert("Pricing settings saved successfully!");
      window.location.reload();
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <Card>
        <CardTitle className="mb-6">Business Information</CardTitle>
        <form onSubmit={handleBusinessSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Business Name"
              name="businessName"
              defaultValue={provider.businessName}
              required
            />
            <Select
              label="Category"
              name="category"
              options={categoryOptions}
              defaultValue={provider.category}
            />
          </div>

          <Textarea
            label="Description"
            name="description"
            defaultValue={provider.description || ""}
            rows={3}
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Address"
              name="address"
              defaultValue={provider.address || ""}
            />
            <Select
              label="County / Region"
              name="city"
              defaultValue={provider.city || ""}
              options={[
                { value: "", label: "Select county/region" },
                ...allSubdivisions,
              ]}
            />
            <Select
              label="Country"
              name="country"
              defaultValue={provider.country || ""}
              options={[
                { value: "", label: "Select country" },
                ...countryOptions,
              ]}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Phone"
              name="phone"
              defaultValue={provider.phone || ""}
              type="tel"
            />
            <Input
              label="Website"
              name="website"
              defaultValue={provider.website || ""}
              type="url"
              placeholder="https://..."
            />
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="travelOutsideArea"
                defaultChecked={provider.travelOutsideArea}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Willing to travel outside my area</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Customers can find you even if their event is outside your city.
                </p>
              </div>
            </label>
            <div className="mt-3 pl-7">
              <Input
                label="Travel radius (km)"
                name="travelRadius"
                type="number"
                min="0"
                step="1"
                defaultValue={provider.travelRadius || ""}
                placeholder="e.g. 50"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Logo URL"
              name="logoUrl"
              defaultValue={provider.logoUrl || ""}
              placeholder="https://..."
            />
            <Input
              label="Cover Image URL"
              name="coverImageUrl"
              defaultValue={provider.coverImageUrl || ""}
              placeholder="https://..."
            />
          </div>

          <Button type="submit">Save Settings</Button>
        </form>
      </Card>

      <Card>
        <div className="mb-6 flex items-center gap-2">
          <Tag className="h-5 w-5 text-primary-600" />
          <CardTitle>Pricing Settings</CardTitle>
        </div>
        <div className="space-y-6">
          <form onSubmit={handlePricingSubmit} className="space-y-4">
            <Input
              label="Default Discount (%)"
              name="defaultDiscount"
              type="number"
              min="0"
              max="100"
              step="1"
              defaultValue={provider.defaultDiscount}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="applyDiscountToAll"
                defaultChecked={provider.applyDiscountToAll}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span>Apply discount to all active services</span>
            </label>
            <Button type="submit">Save Pricing Settings</Button>
          </form>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Pricing Tiers Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between rounded bg-gray-50 p-2 dark:bg-gray-800">
                <span>Active services</span>
                <span className="font-medium">{currentServices.length}</span>
              </div>
              <div className="flex justify-between rounded bg-gray-50 p-2 dark:bg-gray-800">
                <span>Services with discounts</span>
                <span className="font-medium">{discountedServicesCount}</span>
              </div>
              {pricingRules.length > 0 && (
                <>
                  <h4 className="mt-3 text-xs font-medium uppercase text-gray-500">Dynamic Pricing Rules</h4>
                  {pricingRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between text-sm">
                      <span>
                        {rule.eventType
                          ? EVENT_TYPES.find((e) => e.value === rule.eventType)?.label
                          : rule.name}
                        {rule.isWeekend && " (Weekend)"}
                        {rule.isPeakSeason && " (Peak)"}
                      </span>
                      <span className="font-medium">
                        {rule.modifierType === "multiplier"
                          ? `×${rule.priceModifier}`
                          : rule.modifierType === "percentage"
                          ? `+${rule.priceModifier}%`
                          : formatCurrency(rule.priceModifier, currency)}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {pricingRules.length === 0 && (
                <p className="text-xs text-gray-400">No dynamic pricing rules configured.</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
