"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/Navigation";
import { Input, Select } from "@/components/ui/Input";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { Card } from "@/components/ui/Card";
import { StarRating } from "@/components/ui/Badge";
import { CategoryIcon } from "@/components/layout/Navigation";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { Search, MapPin } from "lucide-react";
import { fetchCountries, COUNTRIES, type CountryData } from "@/lib/locations";
import { useDetectedLocation, LocationBanner } from "@/components/location/LocationDetector";

interface Provider {
  id: string;
  businessName: string;
  description: string | null;
  category: string;
  city: string | null;
  country: string | null;
  travelOutsideArea: boolean;
  travelRadius: number | null;
  averageRating: number;
  totalReviews: number;
  services: { name: string; basePrice: number }[];
}

function SearchContent() {
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dbCountries, setDbCountries] = useState<CountryData[]>([]);
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    city: searchParams.get("city") || "",
    country: searchParams.get("country") || "",
    travelOutside: searchParams.get("travelOutside") || "",
  });
  const { detected, dismissed, dismiss } = useDetectedLocation();

  useEffect(() => {
    fetchCountries().then(setDbCountries);
  }, []);

  const countries = dbCountries.length > 0 ? dbCountries : COUNTRIES;
  const subdivisions = filters.country
    ? (countries.find((c) => c.name === filters.country)?.subdivisions ?? [])
    : [];

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category) params.set("category", filters.category);
    if (filters.city) params.set("city", filters.city);
    if (filters.country) params.set("country", filters.country);
    if (filters.travelOutside) params.set("travelOutside", filters.travelOutside);

    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/providers?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setProviders(data.providers || []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message || "Failed to load providers");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PublicHeader />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold">Find Event Services</h1>

        {detected && !dismissed && !filters.country && (
          <LocationBanner
            detected={detected}
            onUse={() => setFilters((f) => ({ ...f, country: detected.country, city: "" }))}
            onDismiss={dismiss}
          />
        )}

        <div className="mb-4 grid gap-4 md:grid-cols-4">
          <Input
            label="Search"
            placeholder="Search providers..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          <Select
            label="Category"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            options={[
              { value: "", label: "All Categories" },
              ...SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
            ]}
          />
          <Autocomplete
            label="Country"
            value={filters.country}
            onChange={(val) => setFilters({ ...filters, country: val, city: "" })}
            options={countries.map((c) => ({ value: c.name, label: c.name }))}
            placeholder="All Countries"
            emptyLabel="No countries found"
          />
          <Autocomplete
            label="County / Region"
            value={filters.city}
            onChange={(val) => setFilters({ ...filters, city: val })}
            options={subdivisions}
            placeholder={subdivisions.length === 0 ? "Select a country first" : "All areas"}
            emptyLabel={subdivisions.length === 0 ? "Select a country first" : "No matches found"}
          />
        </div>
        <div className="mb-8 flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              checked={filters.travelOutside === "true"}
              onChange={(e) =>
                setFilters({ ...filters, travelOutside: e.target.checked ? "true" : "" })
              }
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Only show providers willing to travel outside their area
            </span>
          </label>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">Loading providers...</div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => setFilters({ ...filters })}
              className="mt-3 text-sm font-medium text-primary-600 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : providers.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <Search className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
            No providers found. Try adjusting your filters.
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <Link key={provider.id} href={`/providers/${provider.id}`}>
                <Card hover className="h-full">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
                      <CategoryIcon category={provider.category} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{provider.businessName}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {SERVICE_CATEGORIES.find((c) => c.value === provider.category)?.label}
                        {provider.city && ` · ${provider.city}`}
                        {provider.country && `, ${provider.country}`}
                      </p>
                    </div>
                  </div>
                  {provider.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                      {provider.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <StarRating rating={provider.averageRating} />
                    {provider.travelOutsideArea && (
                      <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                        <MapPin className="h-3 w-3" />
                        Travels{provider.travelRadius ? ` ${provider.travelRadius}km` : ""}
                      </span>
                    )}
                  </div>
                  {provider.services.length > 0 && (
                    <p className="mt-2 text-sm text-primary-600">
                      From ${provider.services[0].basePrice}
                    </p>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
