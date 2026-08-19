import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { AddEquipmentForm } from "@/components/providers/AddEquipmentForm";
import { Card, CardTitle } from "@/components/ui/Card";
import { serverApi } from "@/lib/server-api";
import { EquipmentActions } from "./EquipmentActions";

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  quantity: number;
  condition: string;
  description: string | null;
  rentalPrice: number;
  discountPercent: number;
  setupCharge: number;
  transportCharge: number;
  operatorCharge: number;
  isActive: boolean;
  images: string;
}

export default async function EquipmentPage() {
  const session = await getSession();
  if (!session || session.role !== "PROVIDER") redirect("/auth/login");

  const { equipment } = await serverApi<{ equipment: EquipmentItem[] }>("/api/equipment");

  const activeCount = equipment.filter((e) => e.isActive).length;
  const totalQty = equipment.reduce((sum, e) => sum + e.quantity, 0);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Equipment Inventory</h1>
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
              {equipment.length} items · {activeCount} active · {totalQty} total units
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {equipment.length === 0 ? (
              <Card>
                <CardTitle>No equipment yet</CardTitle>
                <p className="mt-2 text-sm text-charcoal-500 dark:text-charcoal-400">Add your first equipment item using the form.</p>
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
