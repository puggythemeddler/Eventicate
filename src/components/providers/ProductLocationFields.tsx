"use client";

import { useEffect, useMemo, useState } from "react";
import { Select } from "@/components/ui/Input";
import { fetchCountries, type CountryData } from "@/lib/locations";

interface ProductLocationFieldsProps {
  country: string;
  city: string;
  onChange: (location: { country: string; city: string }) => void;
  countryName?: string;
  cityName?: string;
  labelCountry?: string;
  labelCity?: string;
}

export function ProductLocationFields({
  country,
  city,
  onChange,
  countryName = "locationCountry",
  cityName = "locationCity",
  labelCountry = "Country",
  labelCity = "City",
}: ProductLocationFieldsProps) {
  const [countries, setCountries] = useState<CountryData[]>([]);

  useEffect(() => {
    fetchCountries().then(setCountries);
  }, []);

  const countryOptions = useMemo(
    () => countries.map((c) => ({ value: c.name, label: c.name })),
    [countries]
  );

  const cityOptions = useMemo(
    () => countries.find((c) => c.name === country)?.subdivisions ?? [],
    [countries, country]
  );

  function handleCountry(next: string) {
    const cityStillValid = next === country || cityOptions.some((o) => o.value === city);
    onChange({ country: next, city: cityStillValid ? city : "" });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <Select
        label={labelCountry}
        name={countryName}
        value={country}
        onChange={(e) => handleCountry(e.target.value)}
        options={[{ value: "", label: "Select country..." }, ...countryOptions]}
      />
      <Select
        label={labelCity}
        name={cityName}
        value={city}
        disabled={!country}
        onChange={(e) => onChange({ country, city: e.target.value })}
        options={[{ value: "", label: country ? "Select city..." : "Select country first" }, ...cityOptions]}
      />
    </div>
  );
}