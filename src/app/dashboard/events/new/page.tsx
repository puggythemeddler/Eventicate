"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { EVENT_TYPES, SERVICE_CATEGORIES } from "@/lib/constants";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    eventType: "WEDDING",
    eventDate: "",
    eventEndDate: "",
    location: "",
    guestCount: 100,
    budgetMin: "",
    budgetMax: "",
    description: "",
    requiredServices: [] as string[],
  });

  const toggleService = (service: string) => {
    setForm((prev) => ({
      ...prev,
      requiredServices: prev.requiredServices.includes(service)
        ? prev.requiredServices.filter((s) => s !== service)
        : [...prev.requiredServices, service],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          guestCount: Number(form.guestCount),
          budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
          budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/dashboard/events/${data.event.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <Link href="/dashboard" className="mb-4 text-sm text-primary-600 hover:underline">
          ← Back to Dashboard
        </Link>
        <Card className="max-w-2xl">
          <CardTitle className="mb-6">Create New Event</CardTitle>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Event Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Sarah & John's Wedding"
              required
            />
            <Select
              label="Event Type"
              value={form.eventType}
              onChange={(e) => setForm({ ...form, eventType: e.target.value })}
              options={EVENT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
            />
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
              placeholder="Venue address or city"
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
                label="Budget Min"
                type="number"
                value={form.budgetMin}
                onChange={(e) => setForm({ ...form, budgetMin: e.target.value })}
              />
              <Input
                label="Budget Max"
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
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </form>
        </Card>
      </PageContent>
    </div>
  );
}
