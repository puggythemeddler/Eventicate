"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AvailabilityCalendar } from "@/components/calendar/AvailabilityCalendar";

interface CalendarSlot {
  date: string;
  status: "AVAILABLE" | "PENDING" | "CONFIRMED" | "UNAVAILABLE";
}

interface PublicAvailabilityCalendarProps {
  providerId: string;
  initialSlots: CalendarSlot[];
}

export function PublicAvailabilityCalendar({
  providerId,
  initialSlots,
}: PublicAvailabilityCalendarProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [slots, setSlots] = useState<CalendarSlot[]>(initialSlots);
  const [loading, setLoading] = useState(false);
  const fetchedMonth = useRef<{ month: number; year: number } | null>(null);

  const handleMonthChange = useCallback(
    (newMonth: number, newYear: number) => {
      setMonth(newMonth);
      setYear(newYear);
    },
    []
  );

  useEffect(() => {
    const already = fetchedMonth.current;
    if (already && already.month === month && already.year === year) return;
    fetchedMonth.current = { month, year };
    setLoading(true);
    fetch(`/api/providers/${providerId}?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((data) => {
        const fetched: Array<{ date: string; status: string }> = data.availability ?? [];
        setSlots(
          fetched.map((a) => ({
            date: new Date(a.date).toISOString(),
            status: a.status as CalendarSlot["status"],
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [providerId, month, year]);

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 dark:bg-gray-900/60">
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      )}
      <AvailabilityCalendar
        slots={slots}
        month={month}
        year={year}
        onMonthChange={handleMonthChange}
        readOnly
      />
    </div>
  );
}