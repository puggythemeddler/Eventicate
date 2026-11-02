"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Theme } from "@/lib/theme-config";
import { useTheme } from "./ThemeProvider";

const themeOptions: { value: Theme; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  const { theme, setTheme } = useTheme();
  const selected = themeOptions.find((option) => option.value === theme) ?? themeOptions[0];
  const Icon = selected.Icon;

  return (
    <label
      className={cn(
        "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
        inverted
          ? "text-charcoal-200 hover:bg-charcoal-800"
          : "text-charcoal-700 hover:bg-sand dark:text-charcoal-200 dark:hover:bg-charcoal-800",
        className
      )}
    >
      <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="sr-only">Color theme</span>
      <select
        aria-label="Color theme"
        value={theme}
        onChange={(event) => setTheme(event.target.value as Theme)}
        className="min-w-0 cursor-pointer appearance-none bg-transparent pr-1 text-inherit focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500"
      >
        {themeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
