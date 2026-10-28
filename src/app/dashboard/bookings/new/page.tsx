"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select, Textarea } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface EventOption {
  id: string;
  title: string;
  eventDate: string;
}

interface ServiceOption {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  discountPercent: number;
}

export default function NewBookingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-charcoal-500 dark:text-charcoal-400">Loading...</div>}>
      <NewBookingContent />
    </Suspense>
  );
}

function NewBookingContent() {
  const currency = useCurrency();
  const router = useRouter();
  const searchParams = useSearchParams();
  const providerId = searchParams.get("providerId") || "";
  const eventIdParam = searchParams.get("eventId") || "";

  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(eventIdParam);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const selectedService = services.find((s) => s.id === selectedServiceId);
  const hasDiscount = selectedService ? selectedService.discountPercent > 0 : false;
  const discountedPrice = selectedService
    ? selectedService.basePrice * (100 - selectedService.discountPercent) / 100
    : 0;

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []));
  }, []);

  useEffect(() => {
    if (providerId) {
      fetch(`/api/providers/${providerId}`)
        .then((r) => r.json())
        .then((data) => setServices(data.provider?.services || []));
    }
  }, [providerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !providerId) return;
    setLoading(true);
    try {
      const notes = customerNotes || undefined;

      const quotationDetails = selectedService
        ? {
            serviceName: selectedService.name,
            basePrice: selectedService.basePrice,
            discountPercent: selectedService.discountPercent,
            finalPrice: discountedPrice,
          }
        : undefined;

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          providerId,
          serviceId: selectedServiceId || undefined,
          customerNotes: notes || undefined,
          quotationDetails: quotationDetails ? JSON.stringify(quotationDetails) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create booking");
      router.push(`/dashboard/bookings/${data.booking.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <Link
          href={providerId ? `/providers/${providerId}` : "/dashboard/bookings"}
          className="mb-4 text-sm text-primary-600 hover:underline"
        >
          ← {providerId ? "Back to Provider" : "Back to Bookings"}
        </Link>
        <Card className="mx-auto max-w-xl">
          <CardTitle className="mb-6">New Booking Request</CardTitle>
          {!providerId ? (
            <div className="space-y-4">
              <p className="text-sm text-charcoal-600 dark:text-charcoal-300">Choose a provider and select Get a Quote on their profile. You can then select your event and share your requirements.</p>
              <Link href="/search" className="inline-block text-sm font-medium text-primary-600 hover:underline">Find a provider</Link>
            </div>
          ) : <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              options={events.map((ev) => ({
                value: ev.id,
                label: `${ev.title} (${new Date(ev.eventDate).toLocaleDateString()})`,
              }))}
              required
            />
            {services.length > 0 && (
              <Select
                label="Service (optional)"
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                options={[
                  { value: "", label: "No specific service" },
                  ...services.map((s) => {
                    const svcDiscount = s.discountPercent > 0;
                    const svcDiscounted = s.basePrice * (100 - s.discountPercent) / 100;
                    return {
                      value: s.id,
                      label: svcDiscount
                        ? `${s.name} - ${formatCurrency(s.basePrice, currency)} (${s.discountPercent}% off → ${formatCurrency(svcDiscounted, currency)})`
                        : `${s.name} - ${formatCurrency(s.basePrice, currency)}`,
                    };
                  }),
                ]}
              />
            )}
            <Textarea
              label="Notes for Provider"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={3}
              placeholder="Tell the provider about your requirements..."
            />

            {selectedService && (
              <div className="rounded-lg border border-charcoal-200 dark:border-charcoal-800 bg-sand dark:bg-charcoal-800 p-4">
                <h4 className="mb-2 text-sm font-medium text-charcoal-700 dark:text-charcoal-200">Cost Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-charcoal-500 dark:text-charcoal-400">{selectedService.name}</span>
                    <span className={hasDiscount ? "text-charcoal-400 dark:text-charcoal-500 line-through" : "font-medium"}>
                      {formatCurrency(selectedService.basePrice, currency)}
                    </span>
                  </div>
                  {hasDiscount && (
                    <>
                      <div className="flex justify-between text-olive-700 dark:text-olive-400">
                        <span>Discount ({selectedService.discountPercent}%)</span>
                        <span>-{formatCurrency(selectedService.basePrice - discountedPrice, currency)}</span>
                      </div>
                      <div className="flex justify-between border-t border-charcoal-200 dark:border-charcoal-800 pt-1 font-medium">
                        <span>Final Price</span>
                        <span className="text-primary-600">{formatCurrency(discountedPrice, currency)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <Button type="submit" disabled={loading || !selectedEventId} className="w-full">
              {loading ? "Submitting..." : "Get a Quote"}
            </Button>
          </form>}
        </Card>
      </PageContent>
    </div>
  );
}
