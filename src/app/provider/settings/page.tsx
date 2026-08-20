import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { serverApi } from "@/lib/server-api";
import { COUNTRIES } from "@/lib/locations";
import { SettingsForm } from "./SettingsForm";
import { VerificationSection } from "./VerificationSection";

interface CountryData {
  name: string;
  subdivisions: { value: string; label: string }[];
}

interface PricingRuleRow {
  id: string;
  name: string;
  eventType: string | null;
  isWeekend: boolean;
  isPeakSeason: boolean;
  priceModifier: number;
  modifierType: string;
  isActive: boolean;
}

interface SettingsData {
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
    isApproved: boolean;
    verificationStatus: string;
    verificationNote: string | null;
  };
  pricingRules: PricingRuleRow[];
  activeServices: { basePrice: number; discountPercent: number }[];
}

export default async function ProviderSettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") redirect("/auth/login");

  let settingsData: SettingsData | null = null;
  let loadError = "";
  try {
    settingsData = await serverApi<SettingsData>("/api/provider/settings");
  } catch {
    loadError = "Failed to load your settings. Please try again.";
  }

  if (!settingsData) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="PROVIDER" />
        <PageContent>
          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Settings</h1>
          </div>
          <Card>
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm text-charcoal-500 dark:text-charcoal-400">{loadError}</p>
              <Link href="/provider">
                <Button variant="outline">Back to Dashboard</Button>
              </Link>
            </div>
          </Card>
        </PageContent>
      </div>
    );
  }

  const provider = settingsData.provider;
  const pricingRules = settingsData.pricingRules.filter((r) => r.isActive);
  const currentServices = settingsData.activeServices;

  let dbCountries: CountryData[] = [];
  try {
    const data = await serverApi<{ countries: CountryData[] }>("/api/locations/public");
    if (data.countries && data.countries.length > 0) dbCountries = data.countries;
  } catch {
    // fall back to static list
  }
  const countryOptions = dbCountries.length > 0
    ? dbCountries.map((c) => ({ value: c.name, label: c.name }))
    : COUNTRIES.map((c) => ({ value: c.name, label: c.name }));
  const allSubdivisions = dbCountries.length > 0
    ? dbCountries.flatMap((c) => c.subdivisions)
    : COUNTRIES.flatMap((c) => c.subdivisions);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Settings</h1>
          <p className="text-charcoal-500 dark:text-charcoal-400">Manage your business profile</p>
        </div>

        <SettingsForm
          provider={{
            ...provider,
            defaultDiscount: provider.defaultDiscount,
            applyDiscountToAll: provider.applyDiscountToAll,
          }}
          countryOptions={countryOptions}
          allSubdivisions={allSubdivisions}
          pricingRules={pricingRules}
          currentServices={currentServices}
        />

        <div className="mt-8">
          <VerificationSection
            verificationStatus={provider.verificationStatus}
            verificationNote={provider.verificationNote}
            isApproved={provider.isApproved}
          />
        </div>
      </PageContent>
    </div>
  );
}
