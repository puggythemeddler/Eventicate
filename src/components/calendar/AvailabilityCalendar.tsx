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
}

const STATUS_COLORS = {
  AVAILABLE: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60",
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  CONFIRMED: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  UNAVAILABLE: "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
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
        disabled={isPast || status === "CONFIRMED" || toggling === day}
        onClick={() => handleDateClick(day)}
        className={cn(
          "aspect-square rounded-lg text-sm font-medium transition-colors",
          isPast ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" : STATUS_COLORS[status],
          isSelected && "ring-2 ring-primary-500 ring-offset-1 dark:ring-offset-gray-900",
          toggling === day && "animate-pulse"
        )}
      >
        {toggling === day ? "..." : day}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-semibold dark:text-gray-100">{MONTHS[month]} {year}</h3>
        <button onClick={nextMonth} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
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
