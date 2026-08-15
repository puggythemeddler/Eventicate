import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import prisma from "@/lib/prisma";
import { COUNTRIES } from "@/lib/locations";
import { SettingsForm } from "./SettingsForm";

export default async function ProviderSettingsPage() {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") redirect("/auth/login");

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) redirect("/auth/login");

  const pricingRules = await prisma.pricingRule.findMany({
    where: { providerId: provider.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const currentServices = await prisma.service.findMany({
    where: { providerId: provider.id, isActive: true },
    select: { basePrice: true, discountPercent: true },
  });

  const dbCountries = await prisma.country.findMany({
    include: { subdivisions: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  const countryOptions = dbCountries.length > 0
    ? dbCountries.map((c) => ({ value: c.name, label: c.name }))
    : COUNTRIES.map((c) => ({ value: c.name, label: c.name }));
  const allSubdivisions = dbCountries.length > 0
    ? dbCountries.flatMap((c) => c.subdivisions.map((s) => ({ value: s.name, label: s.name })))
    : COUNTRIES.flatMap((c) => c.subdivisions);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-gray-500">Manage your business profile</p>
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
      </PageContent>
    </div>
  );
}
