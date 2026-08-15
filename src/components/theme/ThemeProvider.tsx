"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Theme } from "@/lib/theme-config";
import { getSystemTheme, getStoredTheme, setStoredTheme, applyTheme } from "@/lib/theme-config";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    setResolved(stored === "system" ? getSystemTheme() : stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setStoredTheme(theme);
    const newResolved = theme === "system" ? getSystemTheme() : theme;
    setResolved(newResolved);
  }, [theme, mounted]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") {
        const newResolved = getSystemTheme();
        setResolved(newResolved);
        applyTheme("system");
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
