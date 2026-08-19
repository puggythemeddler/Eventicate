"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import { Badge, StarRating } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { Trash2, Plus, ShoppingCart, Calendar, Sparkles } from "lucide-react";

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
    <Suspense
      fallback={
        <div className="flex min-h-screen">
          <Sidebar role="CUSTOMER" />
          <PageContent>
            <div className="flex items-center justify-center py-20 text-sm text-charcoal-500 dark:text-charcoal-400">
              Loading package builder...
            </div>
          </PageContent>
        </div>
      }
    >
      <PackageBuilderContent />
    </Suspense>
  );
}

function PackageBuilderContent() {
  const currency = useCurrency();
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
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold-500" />
            <h1 className="font-display text-2xl font-semibold tracking-tight text-charcoal-900 dark:text-charcoal-100">
              Build Your Event
            </h1>
          </div>
          <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
            Combine one provider per category into a complete package. We&apos;ll request quotes from each provider on your behalf.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-charcoal-950">
                  1
                </span>
                <CardTitle>Select Event</CardTitle>
              </div>
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
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-charcoal-950">
                    2
                  </span>
                  <CardTitle>Add Services</CardTitle>
                </div>
                <p className="mb-4 text-sm text-charcoal-500 dark:text-charcoal-400">
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
                    <div className="rounded-xl border border-dashed border-charcoal-300 py-8 text-center dark:border-charcoal-700">
                      <p className="text-sm text-charcoal-500 dark:text-charcoal-400">
                        {providers.length === 0
                          ? "No providers available yet. Create an event first."
                          : "All categories covered. Review your package below."}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
            <Card>
              <div className="mb-4 flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary-700 dark:text-primary-300" />
                <CardTitle>Package Summary</CardTitle>
              </div>
              {selected.length === 0 ? (
                <p className="py-6 text-center text-sm text-charcoal-400 dark:text-charcoal-500">
                  No services selected yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {selected.map((s) => (
                    <div
                      key={s.serviceId}
                      className="rounded-xl border border-charcoal-200 bg-sand/50 p-3 dark:border-charcoal-800 dark:bg-charcoal-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-charcoal-900 dark:text-charcoal-100">
                            {s.serviceName}
                          </p>
                          <p className="truncate text-xs text-charcoal-500 dark:text-charcoal-400">
                            {s.providerName}
                          </p>
                          <div className="mt-1.5">
                            <Badge variant="info">{s.category.replace(/_/g, " ")}</Badge>
                          </div>
                        </div>
                        <button
                          onClick={() => removeService(s.serviceId)}
                          aria-label={`Remove ${s.serviceName} from package`}
                          className="shrink-0 rounded-lg p-1.5 text-charcoal-400 transition-colors hover:bg-terracotta-50 hover:text-terracotta-600 dark:hover:bg-terracotta-900/30 dark:hover:text-terracotta-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-primary-700 dark:text-primary-400">
                        {formatCurrency(s.price, currency)}
                      </p>
                      <Textarea
                        placeholder="Notes for provider (optional)"
                        value={s.customerNotes}
                        onChange={(e) => updateNotes(s.serviceId, e.target.value)}
                        rows={1}
                        className="mt-2"
                      />
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-charcoal-200 pt-3 dark:border-charcoal-800">
                    <span className="text-sm font-semibold text-charcoal-900 dark:text-charcoal-100">
                      Total ({selected.length} {selected.length === 1 ? "service" : "services"})
                    </span>
                    <span className="font-display text-lg font-semibold text-primary-700 dark:text-primary-400">
                      {formatCurrency(totalCost, currency)}
                    </span>
                  </div>
                </div>
              )}
              <Button
                className="mt-4 w-full"
                variant="gold"
                size="lg"
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
  const currency = useCurrency();
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

  const cat = SERVICE_CATEGORIES.find((c) => c.value === provider.category);
  const catLabel = cat?.label || provider.category;

  return (
    <div className="overflow-hidden rounded-xl border border-charcoal-200 dark:border-charcoal-800">
      <button
        onClick={handleExpand}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-sand dark:hover:bg-charcoal-800"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            {cat?.icon ? <cat.icon className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal-900 dark:text-charcoal-100">
              {provider.businessName}
            </p>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs text-charcoal-500 dark:text-charcoal-400">{catLabel}</span>
              <StarRating rating={provider.averageRating} />
            </div>
          </div>
        </div>
        <Plus className="h-4 w-4 shrink-0 text-primary-700 dark:text-primary-300" />
      </button>
      {expanded && (
        <div className="border-t border-charcoal-100 bg-sand/30 px-4 py-3 dark:border-charcoal-800 dark:bg-charcoal-800/50">
          {loading ? (
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Loading services...</p>
          ) : services.length === 0 ? (
            <p className="text-sm text-charcoal-500 dark:text-charcoal-400">No active services available.</p>
          ) : (
            <div className="space-y-2">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2.5 dark:bg-charcoal-900"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-charcoal-900 dark:text-charcoal-100">
                      {svc.name}
                    </p>
                    <p className="text-xs font-semibold text-primary-700 dark:text-primary-400">
                      {formatCurrency(svc.basePrice, currency)}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => onSelectService(svc)}>
                    Select
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}