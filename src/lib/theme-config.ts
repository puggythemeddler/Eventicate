export type Theme = "light" | "dark" | "system";

export const THEME_KEY = "eventicate-theme";

export function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const t = localStorage.getItem(THEME_KEY);
  return t === "light" || t === "dark" ? t : "system";
}

export function setStoredTheme(theme: Theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

export function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

/**
 * Self-contained: runs as an inline <script> before paint via toString().
 * Must not reference any other module functions — only globals are available.
 * Applies the initial theme and keeps it in sync with the OS when in "system" mode.
 */
export function initTheme() {
  const key = "eventicate-theme";
  const getStored = () => {
    try {
      const t = localStorage.getItem(key);
      return t === "light" || t === "dark" ? t : "system";
    } catch {
      return "system";
    }
  };
  const apply = () => {
    const t = getStored();
    const dark =
      t === "dark" ||
      (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  };
  apply();
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", apply);
}