"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { formatCurrency, parseJsonArray } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { Pencil, MapPin, Trash2 } from "lucide-react";
import Image from "next/image";
import { EditServiceModal } from "@/components/providers/EditServiceModal";

interface ServiceActionsProps {
  service: {
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
  };
}

function ToggleSwitch({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return <Toggle enabled={enabled} onClick={onClick} />;
}

export function ServiceActions({ service }: ServiceActionsProps) {
  const currency = useCurrency();
  const [isActive, setIsActive] = useState(service.isActive);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
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
            <p className="text-xs text-charcoal-500 dark:text-charcoal-400">
              {SERVICE_CATEGORIES.find((c) => c.value === service.category)?.label || service.category}
            </p>
            {(service.locationCity || service.locationCountry) && (
              <p className="mt-0.5 flex items-center text-xs text-charcoal-500 dark:text-charcoal-400">
                <MapPin className="mr-1 inline h-3 w-3" />
                {[service.locationCity, service.locationCountry].filter(Boolean).join(", ")}
              </p>
            )}
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
              <Image key={i} src={url} alt="" width={96} height={72} className="h-16 w-24 rounded object-cover" />
            ))}
          </div>
        )}
        {service.description && (
          <p className="mb-3 text-sm text-charcoal-600 dark:text-charcoal-300">{service.description}</p>
        )}
        <div className="flex items-baseline gap-2">
          {hasDiscount ? (
            <>
              <span className="text-sm text-charcoal-400 line-through dark:text-charcoal-500">{formatCurrency(service.basePrice, currency)}</span>
              <p className="text-lg font-bold text-primary-600">{formatCurrency(discountedPrice, currency)}</p>
            </>
          ) : (
            <p className="text-lg font-bold text-primary-600">{formatCurrency(service.basePrice, currency)}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ToggleSwitch enabled={isActive} onClick={toggleActive} />
          <span className={`text-xs font-medium ${isActive ? "text-olive-700 dark:text-olive-400" : "text-charcoal-400 dark:text-charcoal-500"}`}>
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setEditing(true)} variant="outline" size="sm" aria-label={`Edit ${service.name}`}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button onClick={deleteService} variant="danger" size="sm" disabled={deleting} aria-label={`Delete ${service.name}`}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {editing && (
        <EditServiceModal
          service={service}
          onClose={() => setEditing(false)}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
