"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { Trash2, Plus, ShoppingCart } from "lucide-react";

interface EventOption {
  id: string;
  title: string;
  eventType: string;
}

interface ProviderOption {
  id: string;
  businessName: string;
  category: string;
  averageRating: number;
}

interface ServiceOption {
  id: string;
  name: string;
  category: string;
  basePrice: number;
}

interface SelectedService {
  providerId: string;
  providerName: string;
  serviceId: string;
  serviceName: string;
  category: string;
  price: number;
  customerNotes: string;
}

export default function PackageBuilderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
      <PackageBuilderContent />
    </Suspense>
  );
}

function PackageBuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEventId = searchParams.get("eventId");

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || "");
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [services, setServices] = useState<Record<string, ServiceOption[]>>({});
  const [selected, setSelected] = useState<SelectedService[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => {
        setEvents(data.events || []);
        if (!preselectedEventId && data.events?.length === 1) {
          setSelectedEventId(data.events[0].id);
        }
      })
      .catch(() => {});
  }, [preselectedEventId]);

  useEffect(() => {
    if (!selectedEventId) return;
    fetch(`/api/providers?${new URLSearchParams({ approved: "true" })}`)
      .then((r) => r.json())
      .then((data) => {
        setProviders(data.providers || []);
      })
      .catch(() => {});
  }, [selectedEventId]);

  const loadServices = async (providerId: string) => {
    if (services[providerId]) return;
    try {
      const res = await fetch(`/api/services?providerId=${providerId}`);
      const data = await res.json();
      setServices((prev) => ({ ...prev, [providerId]: data.services || [] }));
    } catch {
      // ignore
    }
  };

  const addService = (provider: ProviderOption, svc: ServiceOption) => {
    if (selected.some((s) => s.category === provider.category)) {
      alert(`You already selected a ${provider.category.replace(/_/g, " ")} service. Remove it first.`);
      return;
    }
    setSelected((prev) => [
      ...prev,
      {
        providerId: provider.id,
        providerName: provider.businessName,
        serviceId: svc.id,
        serviceName: svc.name,
        category: provider.category,
        price: svc.basePrice,
        customerNotes: "",
      },
    ]);
  };

  const removeService = (serviceId: string) => {
    setSelected((prev) => prev.filter((s) => s.serviceId !== serviceId));
  };

  const updateNotes = (serviceId: string, notes: string) => {
    setSelected((prev) => prev.map((s) => (s.serviceId === serviceId ? { ...s, customerNotes: notes } : s)));
  };

  const totalCost = selected.reduce((sum, s) => sum + s.price, 0);

  const handleSubmit = async () => {
    if (!selectedEventId || selected.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          services: selected.map((s) => ({
            providerId: s.providerId,
            serviceId: s.serviceId,
            customerNotes: s.customerNotes || undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create package");
      router.push(`/dashboard/bookings?status=QUOTATION_REQUESTED`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create package");
    } finally {
      setSubmitting(false);
    }
  };

  const usedCategories = new Set(selected.map((s) => s.category));
  const availableProviders = providers.filter((p) => !usedCategories.has(p.category));

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Package Builder</h1>
            <p className="text-sm text-gray-500">Build a complete event package from multiple providers</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardTitle className="mb-4">1. Select Event</CardTitle>
              <Select
                options={[
                  { value: "", label: "Choose an event..." },
                  ...events.map((e) => ({
                    value: e.id,
                    label: `${e.title} (${e.eventType})`,
                  })),
                ]}
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              />
            </Card>

            {selectedEventId && (
              <Card>
                <CardTitle className="mb-4">2. Add Services</CardTitle>
                <p className="mb-4 text-sm text-gray-500">
                  Select one provider per category. Choose a provider, then pick a service.
                </p>
                <div className="space-y-4">
                  {availableProviders.map((provider) => (
                    <ProviderSelector
                      key={provider.id}
                      provider={provider}
                      services={services[provider.id] || []}
                      onSelectProvider={() => loadServices(provider.id)}
                      onSelectService={(svc) => addService(provider, svc)}
                    />
                  ))}
                  {availableProviders.length === 0 && (
                    <p className="text-sm text-gray-400">
                      {providers.length === 0
                        ? "No providers available. Create an event first."
                        : "All categories covered. Review your package below."}
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardTitle className="mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Package Summary
                </div>
              </CardTitle>
              {selected.length === 0 ? (
                <p className="text-sm text-gray-400">No services selected yet.</p>
              ) : (
                <div className="space-y-3">
                  {selected.map((s) => (
                    <div key={s.serviceId} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">{s.serviceName}</p>
                          <p className="text-xs text-gray-500">{s.providerName}</p>
                          <Badge variant="info">{s.category.replace(/_/g, " ")}</Badge>
                        </div>
                        <button
                          onClick={() => removeService(s.serviceId)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-sm font-medium text-primary-600">{formatCurrency(s.price)}</p>
                      <Textarea
                        placeholder="Notes for provider (optional)"
                        value={s.customerNotes}
                        onChange={(e) => updateNotes(s.serviceId, e.target.value)}
                        rows={1}
                        className="mt-2"
                      />
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary-600">{formatCurrency(totalCost)}</span>
                    </div>
                  </div>
                </div>
              )}
              <Button
                className="mt-4 w-full"
                onClick={handleSubmit}
                disabled={!selectedEventId || selected.length === 0 || submitting}
              >
                {submitting ? "Creating Bookings..." : `Book Package (${selected.length} services)`}
              </Button>
            </Card>
          </div>
        </div>
      </PageContent>
    </div>
  );
}

function ProviderSelector({
  provider,
  services,
  onSelectProvider,
  onSelectService,
}: {
  provider: ProviderOption;
  services: ServiceOption[];
  onSelectProvider: () => void;
  onSelectService: (svc: ServiceOption) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    if (!expanded && services.length === 0) {
      setLoading(true);
      await onSelectProvider();
      setLoading(false);
    }
    setExpanded(!expanded);
  };

  const catLabel = SERVICE_CATEGORIES.find((c) => c.value === provider.category)?.label || provider.category;

  return (
    <div className="rounded-lg border border-gray-200">
      <button
        onClick={handleExpand}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <div>
          <p className="font-medium text-sm">{provider.businessName}</p>
          <p className="text-xs text-gray-500">{catLabel} · {provider.averageRating.toFixed(1)} ★</p>
        </div>
        <Plus className="h-4 w-4 text-primary-600" />
      </button>
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          {loading ? (
            <p className="text-sm text-gray-400">Loading services...</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-gray-400">No active services available.</p>
          ) : (
            <div className="space-y-2">
              {services.map((svc) => (
                <div key={svc.id} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{svc.name}</p>
                    <p className="text-xs text-primary-600">{formatCurrency(svc.basePrice)}</p>
                  </div>
                  <Button size="sm" onClick={() => onSelectService(svc)}>Select</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
