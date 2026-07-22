import { create } from "zustand";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "yres-sidebar-collapsed";

function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
}

interface SidebarStore {
  collapsed: boolean;
  toggle: () => void;
}

/**
 * Sof-mijoz holat (docs/ui-guidelines.md's Zustand-vs-TanStack-Query
 * boundary — sidebar collapse is a display preference, never persisted
 * server-side), localStorage-backed like use-theme-store.ts so it survives
 * a refresh but never syncs across devices (i18n-and-appearance.md's
 * deliberate scope line for this kind of preference).
 */
export const useSidebarStore = create<SidebarStore>((set, get) => ({
  collapsed: readStoredCollapsed(),
  toggle: () => {
    const next = !get().collapsed;
    window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
    set({ collapsed: next });
  },
}));
