import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { AddServiceForm } from "@/components/providers/AddServiceForm";
import { Card, CardTitle } from "@/components/ui/Card";
import { serverApi } from "@/lib/server-api";
import { ServiceActions } from "./ServiceActions";

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  basePrice: number;
  discountPercent: number;
  locationCity: string | null;
  locationCountry: string | null;
  isActive: boolean;
  images: string;
}

export default async function ServicesPage() {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") redirect("/auth/login");

  const { services } = await serverApi<{ services: ServiceItem[] }>("/api/services");

  let providerSettings: { provider: { city: string | null; country: string | null } } | null = null;
  try {
    providerSettings = await serverApi<{ provider: { city: string | null; country: string | null } }>("/api/provider/settings");
  } catch {
    // location defaults just stay empty
  }
  const defaultCity = providerSettings?.provider?.city || "";
  const defaultCountry = providerSettings?.provider?.country || "";

  const activeCount = services.filter((s) => s.isActive).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Services</h1>
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
              {services.length} total · {activeCount} active
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {services.length === 0 ? (
              <Card>
                <CardTitle>No services yet</CardTitle>
                <p className="mt-2 text-sm text-charcoal-500 dark:text-charcoal-400">Add your first service using the form.</p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((service) => (
                  <Card key={service.id}>
                    <ServiceActions service={service} />
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <Card>
              <CardTitle className="mb-4">Add New Service</CardTitle>
              <AddServiceForm defaultCity={defaultCity} defaultCountry={defaultCountry} />
            </Card>
          </div>
        </div>
      </PageContent>
    </div>
  );
}
