"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/Navigation";
import { Input, Select } from "@/components/ui/Input";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/Badge";
import { CategoryIcon } from "@/components/layout/Navigation";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { formatCurrency, getCurrencyForCountry } from "@/lib/utils";
import { Search, MapPin } from "lucide-react";
import { fetchCountries, COUNTRIES, type CountryData } from "@/lib/locations";
import { useDetectedLocation, LocationBanner } from "@/components/location/LocationDetector";
import { StaggerGroup, StaggerItem } from "@/components/motion/animations";

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

const PAGE_SIZE = 12;

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(() => Math.max(parseInt(searchParams.get("page") || "1", 10), 1));
  const [dbCountries, setDbCountries] = useState<CountryData[]>([]);
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    city: searchParams.get("city") || "",
    country: searchParams.get("country") || "",
    travelOutside: searchParams.get("travelOutside") || "",
    minPrice: searchParams.get("minPrice") || "",
    maxPrice: searchParams.get("maxPrice") || "",
    minRating: searchParams.get("minRating") || "",
  });
  const { detected, dismissed, dismiss } = useDetectedLocation();
  const urlSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCountries().then(setDbCountries);
  }, []);

  const countries = dbCountries.length > 0 ? dbCountries : COUNTRIES;
  const subdivisions = filters.country
    ? (countries.find((c) => c.name === filters.country)?.subdivisions ?? [])
    : [];

  // Sync filter state to the URL (shareable / back-button friendly)
  useEffect(() => {
    if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    urlSyncRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.city) params.set("city", filters.city);
      if (filters.country) params.set("country", filters.country);
      if (filters.travelOutside) params.set("travelOutside", filters.travelOutside);
      if (filters.minPrice) params.set("minPrice", filters.minPrice);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
      if (filters.minRating) params.set("minRating", filters.minRating);
      if (page > 1) params.set("page", String(page));
      const query = params.toString();
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    }, 400);
    return () => {
      if (urlSyncRef.current) clearTimeout(urlSyncRef.current);
    };
  }, [filters, page, pathname, router]);

  useEffect(() => {
    if (fetchRef.current) clearTimeout(fetchRef.current);
    fetchRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.city) params.set("city", filters.city);
      if (filters.country) params.set("country", filters.country);
      if (filters.travelOutside) params.set("travelOutside", filters.travelOutside);
      if (filters.minPrice) params.set("minPrice", filters.minPrice);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
      if (filters.minRating) params.set("minRating", filters.minRating);
      params.set("page", String(page));
      params.set("limit", String(PAGE_SIZE));

      setLoading(true);
      setError("");
      fetch(`/api/providers?${params}`)
        .then((r) => {
          if (!r.ok) throw new Error(`Request failed (${r.status})`);
          return r.json();
        })
        .then((data) => {
          setProviders(data.providers || []);
          setTotalPages(data.totalPages || 1);
          if (page > (data.totalPages || 1)) setPage(1);
        })
        .catch((e: Error) => {
          setError(e.message || "Failed to load providers");
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);
    return () => {
      if (fetchRef.current) clearTimeout(fetchRef.current);
    };
  }, [filters, page]);

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
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              checked={filters.travelOutside === "true"}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, travelOutside: e.target.checked ? "true" : "" });
              }}
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Only show providers willing to travel outside their area
            </span>
          </label>
          <div className="h-5 w-px bg-gray-300 dark:bg-gray-700" />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Price</label>
            <Input
              aria-label="Minimum price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Min"
              value={filters.minPrice}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, minPrice: e.target.value });
              }}
              className="w-24"
            />
            <span className="text-gray-400">–</span>
            <Input
              aria-label="Maximum price"
              type="number"
              min="0"
              step="0.01"
              placeholder="Max"
              value={filters.maxPrice}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, maxPrice: e.target.value });
              }}
              className="w-24"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-300">Min rating</label>
            <Select
              aria-label="Minimum rating"
              value={filters.minRating}
              onChange={(e) => {
                setPage(1);
                setFilters({ ...filters, minRating: e.target.value });
              }}
              options={[
                { value: "", label: "Any" },
                { value: "4.5", label: "4.5+" },
                { value: "4", label: "4.0+" },
                { value: "3", label: "3.0+" },
              ]}
              className="w-28"
            />
          </div>
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
          <StaggerGroup
            key={JSON.stringify(filters)}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {providers.map((provider) => (
              <StaggerItem key={provider.id} className="h-full">
                <Link href={`/providers/${provider.id}`}>
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
                      From {formatCurrency(provider.services[0].basePrice, getCurrencyForCountry(provider.country))}
                    </p>
                  )}
                </Card>
                </Link>
              </StaggerItem>
            ))}
          </StaggerGroup>
        )}

        {totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next →
            </Button>
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
