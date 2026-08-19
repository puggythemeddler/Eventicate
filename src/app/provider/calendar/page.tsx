"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/Navigation";
import { TopBar } from "@/components/layout/TopBar";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";




import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";
import { Loader2 } from "lucide-react";

interface Slot {
  id: string;
  date: string;
  status: "AVAILABLE" | "PENDING" | "CONFIRMED" | "UNAVAILABLE";
  notes?: string;
}

export default function ProviderCalendarPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchSlots = useCallback(async (m: number, y: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/availability?month=${m}&year=${y}`);
      const data = await res.json();
      setSlots(data.slots || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSlots(month, year);
  }, [month, year, fetchSlots]);

    const handleMonthChange = (newMonth: number, newYear: number) => {
    setMonth(newMonth);
    setYear(newYear);
  };

  const calendarSlots = slots.map((s) => ({
    date: s.date,
    status: s.status as "AVAILABLE" | "PENDING" | "CONFIRMED" | "UNAVAILABLE",
  }));

  return (
    <div className="flex min-h-screen">
      <Sidebar role="PROVIDER" />
      <main className="flex-1 overflow-y-auto">
        <TopBar />
        <div className="p-8">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-semibold text-charcoal-900 dark:text-charcoal-100">Calendar</h1>
            <p className="text-charcoal-500 dark:text-charcoal-400 ">Manage your availability</p>
          </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AvailabilityCalendar
              slots={calendarSlots}
              month={month}
              year={year}
              onMonthChange={handleMonthChange}
            />
          </div>

          <div className="space-y-4">
            <Card>
              <CardTitle className="mb-3">Quick Actions</CardTitle>
              <p className="mb-3 text-sm text-charcoal-500 dark:text-charcoal-400 ">
                Click a date on the calendar to toggle it between available and unavailable.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    setMonth(d.getMonth());
                    setYear(d.getFullYear());
                  }}
                >
                  Today
                </Button>
              </div>
            </Card>

            <Card>
              <CardTitle className="mb-3">Legend</CardTitle>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded bg-olive-100 dark:bg-olive-900/50" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-gold-100 dark:bg-gold-900/50" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-terracotta-100 dark:bg-terracotta-900/50" />
                  <span>Booked / Confirmed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-charcoal-100 dark:bg-charcoal-800 " />
                  <span>Unavailable</span>
                </div>
              </div>
            </Card>

            <Card>
              <CardTitle className="mb-3">Stats</CardTitle>
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-charcoal-400 dark:text-charcoal-500" />
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-charcoal-500 dark:text-charcoal-400 ">Available</span>
                    <span className="font-medium">
                      {slots.filter((s) => s.status === "AVAILABLE" || !slots.some(
                        (s2) => new Date(s2.date).getMonth() === month && new Date(s2.date).getFullYear() === year
                      )).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500 dark:text-charcoal-400 ">Unavailable</span>
                    <span className="font-medium">
                      {slots.filter((s) => s.status === "UNAVAILABLE").length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-charcoal-500 dark:text-charcoal-400 ">Booked</span>
                    <span className="font-medium">
                      {slots.filter((s) => s.status === "CONFIRMED" || s.status === "PENDING").length}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
      </main>
    </div>
  );
}
