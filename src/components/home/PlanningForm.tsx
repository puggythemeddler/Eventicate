"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Autocomplete } from "@/components/ui/Autocomplete";
import { ArrowRight, MapPin } from "lucide-react";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { fetchCountries, COUNTRIES, type CountryData } from "@/lib/locations";

const NEED_OPTIONS = [
  { value: "", label: "Everything for my event" },
  ...SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
];

export function PlanningForm() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [dbCountries, setDbCountries] = useState<CountryData[]>([]);

  useEffect(() => {
    fetchCountries().then(setDbCountries);
  }, []);

  const countries = dbCountries.length > 0 ? dbCountries : COUNTRIES;
  const subdivisions = country
    ? (countries.find((c) => c.name === country)?.subdivisions ?? [])
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (country) params.set("country", country);
    if (city) params.set("city", city);
    const qs = params.toString();
    router.push(`/search${qs ? `?${qs}` : ""}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-2xl border border-charcoal-200 bg-white p-5 shadow-lg dark:border-charcoal-800 dark:bg-charcoal-900 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
    >
      <div>
        <label htmlFor="planning-need" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400">
          What do you need?
        </label>
        <Select
          id="planning-need"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={NEED_OPTIONS}
        />
      </div>
      <div>
        <label htmlFor="planning-country" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400">
          Where?
        </label>
        <Autocomplete
          value={country}
          onChange={(val) => {
            setCountry(val);
            setCity("");
          }}
          options={countries.map((c) => ({ value: c.name, label: c.name }))}
          placeholder="Country"
          emptyLabel="No countries found"
        />
      </div>
      <div>
        <label htmlFor="planning-city" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-charcoal-500 dark:text-charcoal-400">
          Area
        </label>
        <Autocomplete
          value={city}
          onChange={setCity}
          options={subdivisions}
          placeholder={subdivisions.length === 0 ? "Region / county" : "Select an area"}
          emptyLabel="No matches found"
        />
      </div>
      <Button type="submit" variant="gold" size="lg" className="md:min-w-[150px]">
        Start Planning
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
      <p className="col-span-full flex items-center gap-1.5 text-xs text-charcoal-500 dark:text-charcoal-400 md:hidden">
        <MapPin className="h-3.5 w-3.5" />
        We serve Kenya, Uganda and Tanzania.
      </p>
    </form>
  );
}