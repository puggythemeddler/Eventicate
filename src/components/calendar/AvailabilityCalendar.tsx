"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarSlot {
  date: string;
  status: "AVAILABLE" | "PENDING" | "CONFIRMED" | "UNAVAILABLE";
}

interface AvailabilityCalendarProps {
  slots: CalendarSlot[];
  month: number;
  year: number;
  onMonthChange?: (month: number, year: number) => void;
  onDateSelect?: (date: Date) => void;
  selectable?: boolean;
  readOnly?: boolean;
}

const STATUS_COLORS = {
  AVAILABLE: "bg-olive-100 text-olive-800 hover:bg-olive-200 dark:bg-olive-900/40 dark:text-olive-300 dark:hover:bg-olive-900/60",
  PENDING: "bg-gold-100 text-gold-800 dark:bg-gold-900/40 dark:text-gold-300",
  CONFIRMED: "bg-terracotta-100 text-terracotta-800 dark:bg-terracotta-900/40 dark:text-terracotta-300",
  UNAVAILABLE: "bg-charcoal-100 text-charcoal-500 dark:bg-charcoal-700 dark:text-charcoal-400",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function AvailabilityCalendar({
  slots,
  month,
  year,
  onMonthChange = () => {},
  onDateSelect,
  selectable = false,
  readOnly = false,
}: AvailabilityCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const slotMap = new Map(
    slots.map((s) => [new Date(s.date).getDate(), s.status])
  );

  const prevMonth = () => {
    if (month === 0) onMonthChange(11, year - 1);
    else onMonthChange(month - 1, year);
  };

  const nextMonth = () => {
    if (month === 11) onMonthChange(0, year + 1);
    else onMonthChange(month + 1, year);
  };

  const handleDateClick = async (day: number) => {
    if (readOnly) return;
    const date = new Date(year, month, day);
    const currentStatus = slotMap.get(day) || "AVAILABLE";
    if (currentStatus === "CONFIRMED") return;
    setToggling(day);
    try {
      if (selectable) {
        setSelectedDate(date);
        onDateSelect?.(date);
      }
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.toISOString().split("T")[0],
          status: currentStatus === "AVAILABLE" ? "UNAVAILABLE" : "AVAILABLE",
        }),
      });
      if (res.ok) {
        // Trigger parent refresh by calling onMonthChange with same month/year
        onMonthChange(month, year);
      }
    } finally {
      setToggling(null);
    }
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`empty-${i}`} />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const status = slotMap.get(day) || "AVAILABLE";
    const isPast = new Date(year, month, day) < new Date(new Date().setHours(0, 0, 0, 0));
    const isSelected = selectedDate?.getDate() === day &&
      selectedDate?.getMonth() === month &&
      selectedDate?.getFullYear() === year;

    cells.push(
      <button
        key={day}
        type="button"
        disabled={isPast || status === "CONFIRMED" || toggling === day || readOnly}
        onClick={() => handleDateClick(day)}
        className={cn(
          "aspect-square rounded-lg text-sm font-medium transition-colors",
          isPast ? "text-charcoal-300 dark:text-charcoal-600 cursor-not-allowed" : STATUS_COLORS[status],
          isSelected && "ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-charcoal-900",
          toggling === day && "animate-pulse"
        )}
      >
        {toggling === day ? "..." : day}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-charcoal-200 bg-white p-4 dark:border-charcoal-800 dark:bg-charcoal-900">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-lg p-1 hover:bg-sand dark:hover:bg-charcoal-800">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-semibold text-charcoal-900 dark:text-charcoal-100">{MONTHS[month]} {year}</h3>
        <button onClick={nextMonth} className="rounded-lg p-1 hover:bg-sand dark:hover:bg-charcoal-800">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-charcoal-500 dark:text-charcoal-400">
        {DAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">{cells}</div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <span className={cn("h-3 w-3 rounded", color.split(" ")[0])} />
            <StatusBadge status={status} />
          </div>
        ))}
      </div>
    </div>
  );
}
