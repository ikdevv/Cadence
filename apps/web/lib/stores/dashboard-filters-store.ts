import { create } from "zustand";

interface DashboardFiltersState {
  filters: Record<string, string>;
  setFilters: (updates: Record<string, string | undefined>) => void;
}

/**
 * In-memory only — deliberately not persisted to the URL, localStorage, or
 * sessionStorage. These filters can carry a member's user ID, so keeping them
 * out of anywhere that would leak into browser history, shared links, or
 * server access logs is the point. They reset on reload by design.
 */
export const useDashboardFiltersStore = create<DashboardFiltersState>((set) => ({
  filters: {},
  setFilters: (updates) =>
    set((state) => {
      const next = { ...state.filters };
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "" || value === "ALL") {
          delete next[key];
        } else {
          next[key] = value;
        }
      }
      return { filters: next };
    }),
}));
