"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Plus, Trash2, ArrowUp, ArrowDown, Save, CalendarClock } from "lucide-react";

interface TimelineEntry {
  id: string;
  time: string;
  title: string;
  description?: string;
  providerId?: string;
  sortOrder: number;
}

interface EventOption {
  id: string;
  title: string;
  eventDate: string;
}

interface ProviderOption {
  id: string;
  businessName: string;
}

export default function TimelinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen">
          <Sidebar role="CUSTOMER" />
          <PageContent>
            <div className="flex items-center justify-center py-20 text-sm text-charcoal-500 dark:text-charcoal-400">
              Loading timeline...
            </div>
          </PageContent>
        </div>
      }
    >
      <TimelineContent />
    </Suspense>
  );
}

function TimelineContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedEventId = searchParams.get("eventId");

  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || "");
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [newEntry, setNewEntry] = useState({ time: "08:00", title: "", description: "", providerId: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((data) => setEvents(data.events || []))
      .catch(() => {});
    fetch("/api/providers")
      .then((r) => r.json())
      .then((data) => setProviders(data.providers || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    fetch(`/api/timeline?eventId=${selectedEventId}`)
      .then((r) => r.json())
      .then((data) => {
        const sorted = (data.timeline || []).sort((a: TimelineEntry, b: TimelineEntry) => a.sortOrder - b.sortOrder);
        setEntries(sorted);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedEventId]);

  const addEntry = () => {
    if (!newEntry.title.trim()) return;
    const entry: TimelineEntry = {
      id: `entry_${Date.now()}`,
      time: newEntry.time,
      title: newEntry.title,
      description: newEntry.description,
      providerId: newEntry.providerId || undefined,
      sortOrder: entries.length,
    };
    setEntries((prev) => [...prev, entry]);
    setNewEntry({ time: "08:00", title: "", description: "", providerId: "" });
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, field: keyof TimelineEntry, value: string | number) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const moveEntry = (index: number, direction: "up" | "down") => {
    if ((direction === "up" && index === 0) || (direction === "down" && index === entries.length - 1)) return;
    const newEntries = [...entries];
    const target = direction === "up" ? index - 1 : index + 1;
    [newEntries[index], newEntries[target]] = [newEntries[target], newEntries[index]];
    setEntries(newEntries.map((e, i) => ({ ...e, sortOrder: i })));
  };

  const saveTimeline = async () => {
    if (!selectedEventId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: selectedEventId,
          timeline: entries.map(({ id, time, title, description, providerId, sortOrder }) => ({
            id, time, title, description, providerId, sortOrder,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.refresh();
    } catch {
      alert("Failed to save timeline");
    } finally {
      setSaving(false);
    }
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="flex min-h-screen">
      <Sidebar role="CUSTOMER" />
      <PageContent>
        <Link
          href={preselectedEventId ? `/dashboard/events/${preselectedEventId}` : "/dashboard/events"}
          className="mb-4 inline-block text-sm text-primary-600 hover:underline"
        >
          ← {preselectedEventId ? "Back to Event" : "Back to My Events"}
        </Link>
        <div className="mb-8">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-charcoal-900 dark:text-charcoal-100">
            Timeline Planner
          </h1>
          <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
            Map out the run of show with time markers and assigned providers.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-6">
            <Card>
              <CardTitle className="mb-4">Select Event</CardTitle>
              <Select
                options={[
                  { value: "", label: "Choose an event..." },
                  ...events.map((e) => ({
                    value: e.id,
                    label: `${e.title} (${new Date(e.eventDate).toLocaleDateString()})`,
                  })),
                ]}
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
              />
            </Card>

            {selectedEventId && (
              <Card>
                <CardTitle className="mb-4">Add Entry</CardTitle>
                <div className="space-y-3">
                  <Input
                    label="Time"
                    type="time"
                    value={newEntry.time}
                    onChange={(e) => setNewEntry({ ...newEntry, time: e.target.value })}
                  />
                  <Input
                    label="Activity"
                    value={newEntry.title}
                    onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                    placeholder="e.g. Setup"
                  />
                  <Textarea
                    label="Description"
                    value={newEntry.description}
                    onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                    rows={2}
                    placeholder="Optional details..."
                  />
                  <Select
                    label="Assigned Provider (optional)"
                    value={newEntry.providerId}
                    onChange={(e) => setNewEntry({ ...newEntry, providerId: e.target.value })}
                    options={[
                      { value: "", label: "No provider" },
                      ...providers.map((p) => ({ value: p.id, label: p.businessName })),
                    ]}
                  />
                  <Button onClick={addEntry} disabled={!newEntry.title.trim()} className="w-full">
                    <Plus className="mr-1 h-4 w-4" />
                    Add Entry
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            {!selectedEventId && (
              <Card>
                <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-sand text-primary-700 dark:bg-charcoal-800 dark:text-primary-300">
                    <CalendarClock className="h-7 w-7" />
                  </span>
                  <div>
                    <CardTitle className="text-center">Select an event to plan</CardTitle>
                    <p className="mt-2 text-sm text-charcoal-500 dark:text-charcoal-400">
                      Create a detailed run of show with time markers and assigned providers.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {selectedEventId && loading && (
              <Card>
                <p className="py-12 text-center text-sm text-charcoal-500 dark:text-charcoal-400">
                  Loading timeline...
                </p>
              </Card>
            )}

            {selectedEventId && !loading && (
              <Card>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <CardTitle>
                    {selectedEvent?.title || "Event"} Timeline
                    <span className="ml-2 text-sm font-normal text-charcoal-400 dark:text-charcoal-500">
                      ({entries.length} entries)
                    </span>
                  </CardTitle>
                  {entries.length > 0 && (
                    <Button onClick={saveTimeline} disabled={saving} size="sm" variant="dark">
                      <Save className="mr-1 h-4 w-4" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  )}
                </div>

                {entries.length === 0 ? (
                  <p className="py-10 text-center text-sm text-charcoal-500 dark:text-charcoal-400">
                    No timeline entries yet. Add your first entry on the left.
                  </p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-8 top-2 bottom-2 w-0.5 bg-charcoal-200 dark:bg-charcoal-700" />
                    <div className="space-y-4">
                      {entries.map((entry, index) => (
                        <div key={entry.id} className="relative flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-charcoal-950">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1 rounded-xl border border-charcoal-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="rounded bg-sand px-1.5 py-0.5 text-xs font-semibold text-primary-700 dark:bg-charcoal-800 dark:text-primary-300">
                                    {entry.time}
                                  </span>
                                  {editingId === entry.id ? (
                                    <Input
                                      value={entry.title}
                                      onChange={(e) => updateEntry(entry.id, "title", e.target.value)}
                                      className="!py-0 !text-sm"
                                    />
                                  ) : (
                                    <span className="font-medium text-charcoal-900 dark:text-charcoal-100">
                                      {entry.title}
                                    </span>
                                  )}
                                </div>
                                {editingId === entry.id ? (
                                  <Textarea
                                    value={entry.description || ""}
                                    onChange={(e) => updateEntry(entry.id, "description", e.target.value)}
                                    rows={2}
                                    className="mt-1"
                                  />
                                ) : (
                                  entry.description && (
                                    <p className="mt-1 text-sm text-charcoal-500 dark:text-charcoal-400">
                                      {entry.description}
                                    </p>
                                  )
                                )}
                                {entry.providerId && (
                                  <p className="mt-1 text-xs text-charcoal-400 dark:text-charcoal-500">
                                    Provider: {providers.find((p) => p.id === entry.providerId)?.businessName || "Unknown"}
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-1">
                                <button
                                  onClick={() => moveEntry(index, "up")}
                                  disabled={index === 0}
                                  aria-label="Move entry up"
                                  className="rounded-lg p-1.5 text-charcoal-400 transition-colors hover:bg-sand hover:text-charcoal-700 disabled:opacity-30 dark:hover:bg-charcoal-800 dark:hover:text-charcoal-200"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => moveEntry(index, "down")}
                                  disabled={index === entries.length - 1}
                                  aria-label="Move entry down"
                                  className="rounded-lg p-1.5 text-charcoal-400 transition-colors hover:bg-sand hover:text-charcoal-700 disabled:opacity-30 dark:hover:bg-charcoal-800 dark:hover:text-charcoal-200"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                                  aria-label={editingId === entry.id ? "Done editing" : "Edit entry"}
                                  className="rounded-lg p-1.5 text-charcoal-400 transition-colors hover:bg-sand hover:text-charcoal-700 dark:hover:bg-charcoal-800 dark:hover:text-charcoal-200"
                                >
                                  <span className="text-xs">{editingId === entry.id ? "Done" : "Edit"}</span>
                                </button>
                                <button
                                  onClick={() => removeEntry(entry.id)}
                                  aria-label="Delete entry"
                                  className="rounded-lg p-1.5 text-charcoal-400 transition-colors hover:bg-terracotta-50 hover:text-terracotta-600 dark:hover:bg-terracotta-900/30 dark:hover:text-terracotta-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </PageContent>
    </div>
  );
}