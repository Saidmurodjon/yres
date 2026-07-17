import { create } from "zustand";

export type ThemePreference = "light" | "dark" | "system";

/** Same key index.html's blocking pre-paint script reads — keep in sync. */
const THEME_STORAGE_KEY = "yres-theme";

function applyTheme(theme: ThemePreference) {
  if (theme === "system") {
    // Lets packages/ui/src/styles/globals.css's `prefers-color-scheme`
    // fallback take over instead of forcing either explicit theme.
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function readStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

interface ThemeStore {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

/**
 * Sof-mijoz holat (docs/ui-guidelines.md's Zustand-vs-TanStack-Query
 * boundary — theme is never persisted server-side). Initial value mirrors
 * whatever index.html's blocking script already applied before React
 * mounted, so this doesn't need to re-apply on first render — only
 * setTheme() (an explicit user change) does.
 */
export const useThemeStore = create<ThemeStore>((set) => ({
  theme: readStoredTheme(),
  setTheme: (theme) => {
    if (theme === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    applyTheme(theme);
    set({ theme });
  },
}));
