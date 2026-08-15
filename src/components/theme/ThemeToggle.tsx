"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Theme } from "@/lib/theme-config";

const cycle: Theme[] = ["system", "light", "dark"];

const icons: Record<Theme, React.ReactNode> = {
  system: <Monitor className="h-4 w-4" />,
  light: <Sun className="h-4 w-4" />,
  dark: <Moon className="h-4 w-4" />,
};

const labels: Record<Theme, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  const cycleTheme = () => {
    const idx = cycle.indexOf(theme);
    setTheme(cycle[(idx + 1) % cycle.length]);
  };

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800",
        className
      )}
      title={`Theme: ${labels[theme]}`}
    >
      {icons[theme]}
      <span className="hidden lg:inline">{labels[theme]}</span>
    </button>
  );
}
