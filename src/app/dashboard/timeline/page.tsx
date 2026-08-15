"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "@/components/layout/Navigation";
import { PageContent } from "@/components/layout/PageContent";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Clock, Plus, Trash2, ArrowUp, ArrowDown, Save } from "lucide-react";

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
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading...</div>}>
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Timeline Planner</h1>
            <p className="text-sm text-gray-500">Plan your event schedule</p>
          </div>
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="mb-4 h-12 w-12 text-gray-300" />
                  <CardTitle>Select an event to plan</CardTitle>
                  <p className="mt-2 text-sm text-gray-500">
                    Create a detailed timeline with time markers and assigned providers.
                  </p>
                </div>
              </Card>
            )}

            {selectedEventId && loading && (
              <Card>
                <p className="text-center text-sm text-gray-500">Loading timeline...</p>
              </Card>
            )}

            {selectedEventId && !loading && (
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <CardTitle>
                    {selectedEvent?.title || "Event"} Timeline
                    <span className="ml-2 text-sm font-normal text-gray-500">({entries.length} entries)</span>
                  </CardTitle>
                  {entries.length > 0 && (
                    <Button onClick={saveTimeline} disabled={saving} size="sm">
                      <Save className="mr-1 h-4 w-4" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  )}
                </div>

                {entries.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No timeline entries yet. Add your first entry on the left.
                  </p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-8 top-0 h-full w-0.5 bg-primary-200" />
                    <div className="space-y-4">
                      {entries.map((entry, index) => (
                        <div key={entry.id} className="relative flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                              {index + 1}
                            </div>
                          </div>
                          <div className="flex-1 rounded-lg border border-gray-100 bg-white p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-xs font-medium text-primary-600">{entry.time}</span>
                                  {editingId === entry.id ? (
                                    <Input
                                      value={entry.title}
                                      onChange={(e) => updateEntry(entry.id, "title", e.target.value)}
                                      className="!py-0 !text-sm"
                                    />
                                  ) : (
                                    <span className="font-medium">{entry.title}</span>
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
                                    <p className="mt-1 text-sm text-gray-500">{entry.description}</p>
                                  )
                                )}
                                {entry.providerId && (
                                  <p className="mt-1 text-xs text-gray-400">
                                    Provider: {providers.find((p) => p.id === entry.providerId)?.businessName || "Unknown"}
                                  </p>
                                )}
                              </div>
                              <div className="ml-2 flex items-center gap-1">
                                <button
                                  onClick={() => moveEntry(index, "up")}
                                  disabled={index === 0}
                                  className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => moveEntry(index, "down")}
                                  disabled={index === entries.length - 1}
                                  className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => setEditingId(editingId === entry.id ? null : entry.id)}
                                  className="rounded p-1 text-gray-400 hover:bg-gray-100"
                                >
                                  <span className="text-xs">{editingId === entry.id ? "Done" : "Edit"}</span>
                                </button>
                                <button
                                  onClick={() => removeEntry(entry.id)}
                                  className="rounded p-1 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="h-3 w-3" />
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
