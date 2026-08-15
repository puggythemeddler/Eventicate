"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, parseJsonArray } from "@/lib/utils";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { Trash2 } from "lucide-react";
import Image from "next/image";

interface ServiceActionsProps {
  service: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    basePrice: number;
    discountPercent: number;
    isActive: boolean;
    images: string;
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
        enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
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

export function ServiceActions({ service }: ServiceActionsProps) {
  const [isActive, setIsActive] = useState(service.isActive);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const images = parseJsonArray<string>(service.images);
  const hasDiscount = service.discountPercent > 0;
  const discountedPrice = (service.basePrice * (100 - service.discountPercent)) / 100;

  async function toggleActive() {
    const next = !isActive;
    setIsActive(next);
    await fetch("/api/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: service.id, isActive: next }),
    });
    router.refresh();
  }

  async function deleteService() {
    if (!confirm("Delete this service?")) return;
    setDeleting(true);
    await fetch(`/api/services?id=${service.id}`, { method: "DELETE" });
    router.refresh();
    setDeleting(false);
  }

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h3 className="font-semibold">{service.name}</h3>
            <p className="text-xs text-gray-500">
              {SERVICE_CATEGORIES.find((c) => c.value === service.category)?.label || service.category}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasDiscount && <Badge variant="warning">{service.discountPercent}% OFF</Badge>}
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
        {service.description && (
          <p className="mb-3 text-sm text-gray-600">{service.description}</p>
        )}
        <div className="flex items-baseline gap-2">
          {hasDiscount ? (
            <>
              <span className="text-sm text-gray-400 line-through">{formatCurrency(service.basePrice)}</span>
              <p className="text-lg font-bold text-primary-600">{formatCurrency(discountedPrice)}</p>
            </>
          ) : (
            <p className="text-lg font-bold text-primary-600">{formatCurrency(service.basePrice)}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ToggleSwitch enabled={isActive} onClick={toggleActive} />
          <span className={`text-xs font-medium ${isActive ? "text-green-600" : "text-gray-400"}`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <Button onClick={deleteService} variant="danger" size="sm" disabled={deleting}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
