"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
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
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onClick}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
        enabled
          ? "bg-green-500"
          : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
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
            <p className="text-xs text-gray-500">{item.subcategory} · {item.category}</p>
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
            <Image key={i} src={url} alt="" width={80} height={60} className="h-15 w-20 rounded object-cover" />
          ))}
        </div>
      )}
      {item.description && (
        <p className="mb-3 text-sm text-gray-600">{item.description}</p>
      )}
      <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
        <span className="text-gray-500">Qty: <strong>{item.quantity}</strong></span>
        <span className="text-gray-500">Condition: <strong>{item.condition}</strong></span>
      </div>
      <div className="mb-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Rental Price</span>
          <span className="font-medium">
            {hasDiscount ? (
              <span className="flex items-center gap-1">
                <span className="text-sm text-gray-400 line-through">{formatCurrency(item.rentalPrice, currency)}</span>
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
              <div className="flex justify-between text-gray-500">
                <span>Setup</span>
                <span>{formatCurrency(item.setupCharge, currency)}</span>
              </div>
            )}
            {item.transportCharge > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Transport</span>
                <span>{formatCurrency(item.transportCharge, currency)}</span>
              </div>
            )}
            {item.operatorCharge > 0 && (
              <div className="flex justify-between text-gray-500">
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
          <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-gray-400"}`}>
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
