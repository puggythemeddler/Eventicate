"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ProviderCoverPhoto } from "./ProviderCoverPhoto";
import { SERVICE_CATEGORIES, EVENT_TYPES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { ArrowRight, Tag } from "lucide-react";
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
    whatsapp: string | null;
    website: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    coverImageIsDemo: boolean;
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
  const [formError, setFormError] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(provider.coverImageUrl || "");
  const [coverImageIsDemo, setCoverImageIsDemo] = useState(provider.coverImageIsDemo);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [businessSaving, setBusinessSaving] = useState(false);

  async function handleBusinessSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    setBusinessSaving(true);
    try {
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
          whatsapp: formData.get("whatsapp") || undefined,
          website: formData.get("website") || undefined,
          logoUrl: formData.get("logoUrl") || undefined,
          coverImageUrl: formData.get("coverImageUrl") ?? "",
          coverImageIsDemo: formData.get("coverImageIsDemo") === "on",
          travelOutsideArea: formData.get("travelOutsideArea") === "on",
          travelRadius: formData.get("travelRadius") ? Number(formData.get("travelRadius")) : null,
        }),
      });
      if (res.ok) {
        alert("Settings saved successfully!");
      } else {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || "Failed to save settings. Please try again.");
      }
    } catch {
      setFormError("We couldn’t save your settings. Check your connection and try again.");
    } finally {
      setBusinessSaving(false);
    }
  }

  async function handlePricingSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
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
    } else {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error || "Failed to save pricing settings. Please try again.");
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      {formError && (
        <div className="rounded-lg bg-terracotta-50 p-3 text-sm text-terracotta-700 dark:bg-terracotta-900/30 dark:text-terracotta-400">
          {formError}
        </div>
      )}
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
              label="WhatsApp Number"
              name="whatsapp"
              defaultValue={provider.whatsapp || ""}
              type="tel"
              placeholder="e.g. +254712345678"
            />
          </div>
          <Input
            label="Website"
            name="website"
            defaultValue={provider.website || ""}
            type="url"
            placeholder="https://..."
          />

          <div className="rounded-lg border border-charcoal-200 bg-sand p-4 dark:border-charcoal-700 dark:bg-charcoal-800/50">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="travelOutsideArea"
                defaultChecked={provider.travelOutsideArea}
                className="mt-0.5 h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500 dark:border-charcoal-700"
              />
              <div>
                <p className="font-medium text-charcoal-900 dark:text-charcoal-100">Willing to travel outside my area</p>
                <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
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

          <Input
            label="Logo URL"
            name="logoUrl"
            defaultValue={provider.logoUrl || ""}
            placeholder="https://..."
          />

          <input type="hidden" name="coverImageUrl" value={coverImageUrl} readOnly />
          <ProviderCoverPhoto
            value={coverImageUrl}
            onChange={(url) => {
              setCoverImageUrl(url);
              if (!url) setCoverImageIsDemo(false);
            }}
            onUploadingChange={setPhotoUploading}
          />
          <label className="flex items-start gap-3 rounded-lg bg-sand p-4 dark:bg-charcoal-800">
            <input
              type="checkbox"
              name="coverImageIsDemo"
              checked={coverImageIsDemo}
              disabled={!coverImageUrl || photoUploading}
              onChange={(event) => setCoverImageIsDemo(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500 dark:border-charcoal-700"
            />
            <span>
              <span className="block text-sm font-medium text-charcoal-900 dark:text-charcoal-100">This is an illustrative or demo photo</span>
              <span className="mt-1 block text-xs leading-relaxed text-charcoal-600 dark:text-charcoal-300">Customers will see an “Illustrative photo” label on it. Leave this off for photos of your own work.</span>
            </span>
          </label>

          <div className="rounded-lg bg-sand p-4 dark:bg-charcoal-800">
            <h3 className="text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">Add examples of your work</h3>
            <p className="mt-1 text-sm leading-relaxed text-charcoal-600 dark:text-charcoal-300">
              Add a few photos to your services, venues, menus or equipment listings. They’ll appear on your public profile. Use your own work, or mark sample images as illustrative in their description.
            </p>
            <Link href="/provider/listings" className="mt-3 inline-flex min-h-11 items-center gap-2 font-medium text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-500 dark:text-primary-300">
              Manage listing photos <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <Button type="submit" disabled={photoUploading || businessSaving}>
            {businessSaving ? "Saving…" : "Save Settings"}
          </Button>
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
                className="rounded border-charcoal-300 text-primary-600 focus:ring-primary-500 dark:border-charcoal-700"
              />
              <span>Apply discount to all active services</span>
            </label>
            <Button type="submit">Save Pricing Settings</Button>
          </form>

          <hr className="border-charcoal-200 dark:border-charcoal-700" />

          <div>
            <h3 className="mb-2 text-sm font-medium text-charcoal-700 dark:text-charcoal-200">Pricing Tiers Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between rounded bg-sand p-2 dark:bg-charcoal-800">
                <span>Active services</span>
                <span className="font-medium">{currentServices.length}</span>
              </div>
              <div className="flex justify-between rounded bg-sand p-2 dark:bg-charcoal-800">
                <span>Services with discounts</span>
                <span className="font-medium">{discountedServicesCount}</span>
              </div>
              {pricingRules.length > 0 && (
                <>
                  <h4 className="mt-3 text-xs font-medium uppercase text-charcoal-500 dark:text-charcoal-400">Dynamic Pricing Rules</h4>
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
                <p className="text-xs text-charcoal-400 dark:text-charcoal-500">No dynamic pricing rules configured.</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
