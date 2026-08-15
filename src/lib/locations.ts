export interface CountryData {
  name: string;
  subdivisions: { value: string; label: string }[];
}

export const COUNTRIES: CountryData[] = [
  {
    name: "Kenya",
    subdivisions: [
      { value: "Baringo", label: "Baringo" },
      { value: "Bomet", label: "Bomet" },
      { value: "Bungoma", label: "Bungoma" },
      { value: "Busia", label: "Busia" },
      { value: "Elgeyo-Marakwet", label: "Elgeyo-Marakwet" },
      { value: "Embu", label: "Embu" },
      { value: "Garissa", label: "Garissa" },
      { value: "Homa Bay", label: "Homa Bay" },
      { value: "Isiolo", label: "Isiolo" },
      { value: "Kajiado", label: "Kajiado" },
      { value: "Kakamega", label: "Kakamega" },
      { value: "Kericho", label: "Kericho" },
      { value: "Kiambu", label: "Kiambu" },
      { value: "Kilifi", label: "Kilifi" },
      { value: "Kirinyaga", label: "Kirinyaga" },
      { value: "Kisii", label: "Kisii" },
      { value: "Kisumu", label: "Kisumu" },
      { value: "Kitui", label: "Kitui" },
      { value: "Kwale", label: "Kwale" },
      { value: "Laikipia", label: "Laikipia" },
      { value: "Lamu", label: "Lamu" },
      { value: "Machakos", label: "Machakos" },
      { value: "Makueni", label: "Makueni" },
      { value: "Mandera", label: "Mandera" },
      { value: "Marsabit", label: "Marsabit" },
      { value: "Meru", label: "Meru" },
      { value: "Migori", label: "Migori" },
      { value: "Mombasa", label: "Mombasa" },
      { value: "Murang'a", label: "Murang'a" },
      { value: "Nairobi", label: "Nairobi" },
      { value: "Nakuru", label: "Nakuru" },
      { value: "Nandi", label: "Nandi" },
      { value: "Narok", label: "Narok" },
      { value: "Nyamira", label: "Nyamira" },
      { value: "Nyandarua", label: "Nyandarua" },
      { value: "Nyeri", label: "Nyeri" },
      { value: "Samburu", label: "Samburu" },
      { value: "Siaya", label: "Siaya" },
      { value: "Taita-Taveta", label: "Taita-Taveta" },
      { value: "Tana River", label: "Tana River" },
      { value: "Tharaka-Nithi", label: "Tharaka-Nithi" },
      { value: "Trans-Nzoia", label: "Trans-Nzoia" },
      { value: "Turkana", label: "Turkana" },
      { value: "Uasin Gishu", label: "Uasin Gishu" },
      { value: "Vihiga", label: "Vihiga" },
      { value: "Wajir", label: "Wajir" },
      { value: "West Pokot", label: "West Pokot" },
    ],
  },
  {
    name: "Uganda",
    subdivisions: [
      { value: "Central Region", label: "Central Region" },
      { value: "Eastern Region", label: "Eastern Region" },
      { value: "Northern Region", label: "Northern Region" },
      { value: "Western Region", label: "Western Region" },
    ],
  },
  {
    name: "Tanzania",
    subdivisions: [
      { value: "Arusha", label: "Arusha" },
      { value: "Dar es Salaam", label: "Dar es Salaam" },
      { value: "Dodoma", label: "Dodoma" },
      { value: "Geita", label: "Geita" },
      { value: "Iringa", label: "Iringa" },
      { value: "Kagera", label: "Kagera" },
      { value: "Katavi", label: "Katavi" },
      { value: "Kigoma", label: "Kigoma" },
      { value: "Kilimanjaro", label: "Kilimanjaro" },
      { value: "Lindi", label: "Lindi" },
      { value: "Manyara", label: "Manyara" },
      { value: "Mara", label: "Mara" },
      { value: "Mbeya", label: "Mbeya" },
      { value: "Morogoro", label: "Morogoro" },
      { value: "Mtwara", label: "Mtwara" },
      { value: "Mwanza", label: "Mwanza" },
      { value: "Njombe", label: "Njombe" },
      { value: "Pemba North", label: "Pemba North" },
      { value: "Pemba South", label: "Pemba South" },
      { value: "Pwani", label: "Pwani" },
      { value: "Rukwa", label: "Rukwa" },
      { value: "Ruvuma", label: "Ruvuma" },
      { value: "Shinyanga", label: "Shinyanga" },
      { value: "Simiyu", label: "Simiyu" },
      { value: "Singida", label: "Singida" },
      { value: "Songwe", label: "Songwe" },
      { value: "Tabora", label: "Tabora" },
      { value: "Tanga", label: "Tanga" },
      { value: "Zanzibar North", label: "Zanzibar North" },
      { value: "Zanzibar South", label: "Zanzibar South" },
      { value: "Zanzibar Urban West", label: "Zanzibar Urban West" },
    ],
  },
];

export function getSubdivisions(country: string, input?: string): { value: string; label: string }[] {
  const found = COUNTRIES.find(
    (c) => c.name.toLowerCase() === country.toLowerCase()
  );
  if (!found) return [];

  if (input) {
    const q = input.toLowerCase();
    return found.subdivisions.filter(
      (s) => s.label.toLowerCase().includes(q)
    );
  }

  return found.subdivisions;
}

export async function fetchCountries(): Promise<CountryData[]> {
  try {
    const res = await fetch("/api/locations/public");
    const data = await res.json();
    if (data.countries && data.countries.length > 0) return data.countries;
  } catch {
    // fallback
  }
  return COUNTRIES;
}
