import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { AddEquipmentForm } from "@/components/providers/AddEquipmentForm";
import { Card, CardTitle } from "@/components/ui/Card";
import prisma from "@/lib/prisma";
import { EquipmentActions } from "./EquipmentActions";

export default async function EquipmentPage() {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") redirect("/auth/login");

  const provider = await prisma.providerProfile.findUnique({
    where: { userId: session.id },
  });
  if (!provider) redirect("/auth/login");

  const equipment = await prisma.equipment.findMany({
    where: { providerId: provider.id },
    orderBy: { createdAt: "desc" },
  });

  const activeCount = equipment.filter((e) => e.isActive).length;
  const totalQty = equipment.reduce((sum, e) => sum + e.quantity, 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Equipment Inventory</h1>
            <p className="text-sm text-gray-500">
              {equipment.length} items · {activeCount} active · {totalQty} total units
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {equipment.length === 0 ? (
              <Card>
                <CardTitle>No equipment yet</CardTitle>
                <p className="mt-2 text-sm text-gray-500">Add your first equipment item using the form.</p>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {equipment.map((item) => (
                  <Card key={item.id}>
                    <EquipmentActions item={item} />
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <Card>
              <CardTitle className="mb-4">Add Equipment</CardTitle>
              <AddEquipmentForm />
            </Card>
          </div>
        </div>
      </PageContent>
    </div>
  );
}
