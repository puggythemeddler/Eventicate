import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { AddServiceForm } from "@/components/providers/AddServiceForm";
import { Card, CardTitle } from "@/components/ui/Card";
import prisma from "@/lib/prisma";
import { ServiceActions } from "./ServiceActions";

export default async function ServicesPage() {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") redirect("/auth/login");

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) redirect("/auth/login");

  const services = await prisma.service.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
  });

  const activeCount = services.filter((s) => s.isActive).length;

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Services</h1>
            <p className="text-sm text-gray-500">
              {services.length} total · {activeCount} active
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {services.length === 0 ? (
              <Card>
                <CardTitle>No services yet</CardTitle>
                <p className="mt-2 text-sm text-gray-500">Add your first service using the form.</p>
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
              <AddServiceForm />
            </Card>
          </div>
        </div>
      </PageContent>
    </div>
  );
}
