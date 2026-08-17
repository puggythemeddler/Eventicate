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
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
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
  const [paymentMethod, setPaymentMethod] = useState("MPESA");
  const [mpesaPhone, setMpesaPhone] = useState("");

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
      const paymentInfo = paymentMethod === "MPESA" ? { paymentMethod, phone: mpesaPhone } : { paymentMethod };
      const notes = customerNotes
        ? `${customerNotes}\n__payment:${JSON.stringify(paymentInfo)}`
        : `__payment:${JSON.stringify(paymentInfo)}`;

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
          ← Back
        </Link>
        <Card className="mx-auto max-w-xl">
          <CardTitle className="mb-6">New Booking Request</CardTitle>
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="space-y-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Method</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {[
                  { value: "MPESA", label: "M-Pesa" },
                  { value: "PESAPAL", label: "PesaPal" },
                  { value: "CARD", label: "Card" },
                  { value: "BANK_TRANSFER", label: "Bank Transfer" },
                  { value: "CASH", label: "Cash" },
                ].map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      paymentMethod === m.value
                        ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {paymentMethod === "MPESA" && (
                <input
                  type="tel"
                  placeholder="M-Pesa phone number"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                />
              )}
            </div>

            {selectedService && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Cost Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{selectedService.name}</span>
                    <span className={hasDiscount ? "text-gray-400 line-through" : "font-medium"}>
                      {formatCurrency(selectedService.basePrice, currency)}
                    </span>
                  </div>
                  {hasDiscount && (
                    <>
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({selectedService.discountPercent}%)</span>
                        <span>-{formatCurrency(selectedService.basePrice - discountedPrice, currency)}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 pt-1 font-medium dark:border-gray-600">
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
          </form>
        </Card>
      </PageContent>
    </div>
  );
}
