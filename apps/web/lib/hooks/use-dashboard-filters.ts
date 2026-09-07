"use client";

import { useCallback } from "react";
import { useDashboardFiltersStore } from "@/lib/stores/dashboard-filters-store";

/**
 * Dashboard filters (week, member, project, status, page) live in memory
 * only — never in the URL. Some of them are internal database IDs (a
 * member's user ID, a project ID), and putting those in the address bar
 * would leak into browser history, shared links, and server access logs.
 *
 * Trade-off: a filtered view is no longer shareable via URL or restored by
 * the back button, and filters reset on reload. That is intentional, not a
 * regression — see the store this reads from.
 */
export function useDashboardFilters() {
  const filters = useDashboardFiltersStore((state) => state.filters);
  const setFilters = useDashboardFiltersStore((state) => state.setFilters);

  const get = useCallback((key: string) => filters[key], [filters]);

  const set = useCallback(
    (updates: Record<string, string | undefined>) => setFilters(updates),
    [setFilters],
  );

  return { get, set };
}
