"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { EVENT_TYPES, SERVICE_CATEGORIES } from "@/lib/constants";

type EventForm = {
  title: string;
  eventType: string;
  status: string;
  eventDate: string;
  eventEndDate: string;
  location: string;
  guestCount: number;
  budgetMin: string;
  budgetMax: string;
  description: string;
  requiredServices: string[];
};

const STATUS_OPTIONS = [
  { value: "PLANNING", label: "Planning" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const eventId = params.id;
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<EventForm | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!res.ok) throw new Error("not found");
        const { event } = await res.json();
        setForm({
          title: event.title,
          eventType: event.eventType,
          status: event.status || "PLANNING",
          eventDate: event.eventDate.slice(0, 16),
          eventEndDate: event.eventEndDate ? event.eventEndDate.slice(0, 16) : "",
          location: event.location,
          guestCount: event.guestCount,
          budgetMin: event.budgetMin != null ? String(event.budgetMin) : "",
          budgetMax: event.budgetMax != null ? String(event.budgetMax) : "",
          description: event.description || "",
          requiredServices: JSON.parse(event.requiredServices || "[]"),
        });
      } catch {
        setNotFound(true);
      }
    })();
  }, [eventId]);

  const toggleService = (service: string) => {
    setForm((prev) =>
      prev
        ? {
            ...prev,
            requiredServices: prev.requiredServices.includes(service)
              ? prev.requiredServices.filter((s) => s !== service)
              : [...prev.requiredServices, service],
          }
        : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          guestCount: Number(form.guestCount),
          budgetMin: form.budgetMin ? Number(form.budgetMin) : null,
          budgetMax: form.budgetMax ? Number(form.budgetMax) : null,
          eventEndDate: form.eventEndDate || null,
          description: form.description || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.error) ? "Invalid form data" : data.error);
      router.push(`/dashboard/events/${eventId}`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update event");
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="CUSTOMER" />
        <PageContent>
          <Card>
            <CardTitle>Event not found</CardTitle>
          </Card>
        </PageContent>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-screen">
        <Sidebar role="CUSTOMER" />
        <PageContent>
          <p className="text-sm text-charcoal-500 dark:text-charcoal-400">Loading...</p>
        </PageContent>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <Link href={`/dashboard/events/${eventId}`} className="mb-4 text-sm text-primary-600 hover:underline">
          ← Back to Event
        </Link>
        <Card className="max-w-2xl">
          <CardTitle className="mb-6">Edit Event</CardTitle>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Event Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Event Type"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value })}
                options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                options={STATUS_OPTIONS}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Event Date"
                type="datetime-local"
                value={form.eventDate}
                onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
                required
              />
              <Input
                label="End Date (optional)"
                type="datetime-local"
                value={form.eventEndDate}
                onChange={(e) => setForm({ ...form, eventEndDate: e.target.value })}
              />
            </div>
            <Input
              label="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
            />
            <Input
              label="Expected Guests"
              type="number"
              value={form.guestCount}
              onChange={(e) => setForm({ ...form, guestCount: Number(e.target.value) })}
              min={1}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Budget Min ($)"
                type="number"
                value={form.budgetMin}
                onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
              />
              <Input
                label="Budget Max ($)"
                type="number"
                value={form.budgetMax}
                onChange={(e) => setForm({ ...form, budgetMax: e.target.value })}
              />
            </div>
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
            <div>
              <label className="mb-2 block text-sm font-medium text-charcoal-700 dark:text-charcoal-200">
                Required Services
              </label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => toggleService(cat.value)}
                    className={`rounded-full px-3 py-1 text-sm ${
                      form.requiredServices.includes(cat.value)
                        ? "bg-primary-600 text-white"
                        : "bg-sand dark:bg-charcoal-800 text-charcoal-700 dark:text-charcoal-200 hover:bg-charcoal-100 dark:hover:bg-charcoal-800"
                    }`}
                  >
                    {cat.icon ? <cat.icon className="mr-1 inline h-4 w-4" /> : null} {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </Card>
      </PageContent>
    </div>
  );
}