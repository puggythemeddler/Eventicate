"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { PublicHeader } from "@/components/layout/Navigation";
import { Input, Select } from "@/components/ui/Input";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { Button } from "@/components/ui/Button";
import { ListingCard } from "@/components/ui/ListingCard";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { Search, SlidersHorizontal, X } from "lucide-react";
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
  verificationStatus: string;
  images: string[];
  coverImageUrl: string | null;
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
  const [total, setTotal] = useState(0);
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

  const activeCategory = SERVICE_CATEGORIES.find((c) => c.value === filters.category);

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
          setTotal(data.total || 0);
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

  const clearFilters = () => {
    setPage(1);
    setFilters({ search: "", category: "", city: "", country: "", travelOutside: "", minPrice: "", maxPrice: "", minRating: "" });
  };

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="min-h-screen bg-cream dark:bg-charcoal-950">
      <PublicHeader />

      {/* Marketplace header */}
      <div className="border-b border-charcoal-200 bg-sand dark:border-charcoal-800 dark:bg-charcoal-900/50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <h1 className="font-display text-3xl font-semibold text-charcoal-900 dark:text-charcoal-100">
            {activeCategory ? activeCategory.label : "Explore the marketplace"}
          </h1>
          <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
            Verified venues, services and rentals from local providers.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_220px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
              <Input
                aria-label="Search providers"
                placeholder="Search providers, services..."
                value={filters.search}
                onChange={(e) => {
                  setPage(1);
                  setFilters({ ...filters, search: e.target.value });
                }}
                className="pl-9"
              />
            </div>
            <Autocomplete
              label=""
              value={filters.country}
              onChange={(val) => {
                setPage(1);
                setFilters({ ...filters, country: val, city: "" });
              }}
              options={countries.map((c) => ({ value: c.name, label: c.name }))}
              placeholder="All countries"
              emptyLabel="No countries found"
            />
            <Autocomplete
              label=""
              value={filters.city}
              onChange={(val) => {
                setPage(1);
                setFilters({ ...filters, city: val });
              }}
              options={subdivisions}
              placeholder={subdivisions.length === 0 ? "All areas" : "Select an area"}
              emptyLabel="No matches found"
            />
          </div>
        </div>
      </div>

      {detected && !dismissed && !filters.country && (
        <div className="mx-auto max-w-7xl px-4 pt-6">
          <LocationBanner
            detected={detected}
            onUse={() => {
              setPage(1);
              setFilters((f) => ({ ...f, country: detected.country, city: "" }));
            }}
            onDismiss={dismiss}
          />
        </div>
      )}

      <div className="mx-auto max-w-7xl gap-10 px-4 py-8 lg:grid lg:grid-cols-[260px_1fr]">
        {/* Filters */}
        <aside className="mb-8 lg:mb-0">
          <div className="lg:sticky lg:top-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-charcoal-700 dark:text-charcoal-200">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </h2>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline dark:text-primary-400"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-7">
              {/* Category */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400">
                  Category
                </p>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPage(1);
                      setFilters({ ...filters, category: "" });
                    }}
                    className={`block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                      !filters.category
                        ? "bg-primary-50 font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-200"
                        : "text-charcoal-600 hover:bg-sand dark:text-charcoal-300 dark:hover:bg-charcoal-800"
                    }`}
                  >
                    All categories
                  </button>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setFilters({ ...filters, category: cat.value });
                      }}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                        filters.category === cat.value
                          ? "bg-primary-50 font-medium text-primary-800 dark:bg-primary-900/30 dark:text-primary-200"
                          : "text-charcoal-600 hover:bg-sand dark:text-charcoal-300 dark:hover:bg-charcoal-800"
                      }`}
                    >
                      <cat.icon className="h-4 w-4 text-charcoal-400 dark:text-charcoal-500" />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400">
                  Price
                </p>
                <div className="flex items-center gap-2">
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
                  />
                  <span className="text-charcoal-400">–</span>
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
                  />
                </div>
              </div>

              {/* Rating */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400">
                  Minimum rating
                </p>
                <Select
                  aria-label="Minimum rating"
                  value={filters.minRating}
                  onChange={(e) => {
                    setPage(1);
                    setFilters({ ...filters, minRating: e.target.value });
                  }}
                  options={[
                    { value: "", label: "Any rating" },
                    { value: "4.5", label: "4.5 & up" },
                    { value: "4", label: "4.0 & up" },
                    { value: "3", label: "3.0 & up" },
                  ]}
                />
              </div>

              {/* Travel */}
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-charcoal-300 text-primary-600 focus:ring-primary-500"
                  checked={filters.travelOutside === "true"}
                  onChange={(e) => {
                    setPage(1);
                    setFilters({ ...filters, travelOutside: e.target.checked ? "true" : "" });
                  }}
                />
                <span className="text-sm text-charcoal-600 dark:text-charcoal-300">
                  Only show providers willing to travel outside their area
                </span>
              </label>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div>
          <p className="mb-4 text-sm text-charcoal-500 dark:text-charcoal-400">
            {loading ? "Searching..." : `${total} provider${total === 1 ? "" : "s"} found`}
          </p>

          {loading ? (
            <div className="py-16 text-center text-charcoal-500 dark:text-charcoal-400">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-charcoal-300 border-t-primary-600 dark:border-charcoal-700 dark:border-t-primary-400" />
              Loading providers...
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-terracotta-600">{error}</p>
              <button
                type="button"
                onClick={() => setFilters({ ...filters })}
                className="mt-3 text-sm font-medium text-primary-700 hover:underline dark:text-primary-400"
              >
                Retry
              </button>
            </div>
          ) : providers.length === 0 ? (
            <div className="rounded-xl border border-charcoal-200 bg-white py-16 text-center dark:border-charcoal-800 dark:bg-charcoal-900">
              <Search className="mx-auto mb-4 h-10 w-10 text-charcoal-300 dark:text-charcoal-700" />
              <p className="font-medium text-charcoal-700 dark:text-charcoal-200">No providers found</p>
              <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
                Try adjusting your filters or exploring a different category.
              </p>
              <Link href="/search" className="mt-4 inline-block">
                <Button variant="outline">Reset search</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {providers.map((provider) => (
                <ListingCard
                  key={provider.id}
                  provider={{
                    ...provider,
                    totalReviews: provider.totalReviews,
                    coverImageUrl: provider.coverImageUrl ?? provider.images?.[0] ?? null,
                  }}
                />
              ))}
            </div>
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
              <span className="text-sm text-charcoal-600 dark:text-charcoal-300">
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