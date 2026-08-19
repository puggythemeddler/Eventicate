"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { formatCurrency, parseJsonArray } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { Trash2, Package } from "lucide-react";
import Image from "next/image";

interface EquipmentActionsProps {
  item: {
    id: string; name: string; category: string; subcategory: string;
    quantity: number; condition: string; description: string | null;
    rentalPrice: number; discountPercent: number; setupCharge: number; transportCharge: number;
    operatorCharge: number; isActive: boolean; images: string;
  };
}

function ToggleSwitch({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return <Toggle enabled={enabled} onClick={onClick} />;
}

export function EquipmentActions({ item }: EquipmentActionsProps) {
  const currency = useCurrency();
  const [isActive, setIsActive] = useState(item.isActive);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const images = parseJsonArray<string>(item.images);
  const hasDiscount = item.discountPercent > 0;
  const discountedPrice = (item.rentalPrice * (100 - item.discountPercent)) / 100;

  async function toggleActive() {
    const next = !isActive;
    setIsActive(next);
    await fetch("/api/equipment", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, isActive: next }),
    });
    router.refresh();
  }

  async function deleteItem() {
    if (!confirm("Delete this equipment?")) return;
    setDeleting(true);
    await fetch(`/api/equipment?id=${item.id}`, { method: "DELETE" });
    router.refresh();
    setDeleting(false);
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-primary-600" />
          <div>
            <h3 className="font-semibold">{item.name}</h3>
            <p className="text-xs text-charcoal-500 dark:text-charcoal-400">{item.subcategory} · {item.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasDiscount && <Badge variant="warning">{item.discountPercent}% OFF</Badge>}
          <Badge variant={isActive ? "success" : "default"}>
            {isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>
      {images.length > 0 && (
        <div className="mb-3 flex gap-1 overflow-x-auto">
          {images.map((url, i) => (
            <Image key={i} src={url} alt="" width={96} height={72} className="h-16 w-24 rounded object-cover" />
          ))}
        </div>
      )}
      {item.description && (
        <p className="mb-3 text-sm text-charcoal-600 dark:text-charcoal-300">{item.description}</p>
      )}
      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <span className="text-charcoal-500 dark:text-charcoal-400">Qty: <strong>{item.quantity}</strong></span>
        <span className="text-charcoal-500 dark:text-charcoal-400">Condition: <strong>{item.condition}</strong></span>
      </div>
      <div className="mb-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-charcoal-500 dark:text-charcoal-400">Rental Price</span>
          <span className="font-medium">
            {hasDiscount ? (
              <span className="flex items-center gap-1">
                <span className="text-sm text-charcoal-400 line-through dark:text-charcoal-500">{formatCurrency(item.rentalPrice, currency)}</span>
                <span className="text-primary-600">{formatCurrency(discountedPrice, currency)}</span>
              </span>
            ) : (
              formatCurrency(item.rentalPrice, currency)
            )}
          </span>
        </div>
        {(item.setupCharge > 0 || item.transportCharge > 0 || item.operatorCharge > 0) && (
          <>
            {item.setupCharge > 0 && (
              <div className="flex justify-between text-charcoal-500 dark:text-charcoal-400">
                <span>Setup</span>
                <span>{formatCurrency(item.setupCharge, currency)}</span>
              </div>
            )}
            {item.transportCharge > 0 && (
              <div className="flex justify-between text-charcoal-500 dark:text-charcoal-400">
                <span>Transport</span>
                <span>{formatCurrency(item.transportCharge, currency)}</span>
              </div>
            )}
            {item.operatorCharge > 0 && (
              <div className="flex justify-between text-charcoal-500 dark:text-charcoal-400">
                <span>Operator</span>
                <span>{formatCurrency(item.operatorCharge, currency)}</span>
              </div>
            )}
          </>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ToggleSwitch enabled={isActive} onClick={toggleActive} />
          <span className={`text-xs font-medium ${isActive ? "text-olive-700 dark:text-olive-400" : "text-charcoal-400 dark:text-charcoal-500"}`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <Button onClick={deleteItem} variant="danger" size="sm" disabled={deleting}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
