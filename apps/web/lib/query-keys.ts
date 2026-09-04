type Filters = Record<string, unknown> | undefined;

/**
 * Centralized so the post-review invalidation is a one-liner rather than a hunt
 * through components for the key that was used.
 */
export const queryKeys = {
  users: {
    active: () => ["users", "active"] as const,
    list: (f?: Filters) => ["users", "list", f] as const,
    profile: (id: string) => ["users", "profile", id] as const,
  },
  invitations: {
    list: (status?: string) => ["invitations", status ?? "all"] as const,
    validate: (token: string) => ["invitations", "validate", token] as const,
  },
  projects: {
    list: (includeInactive?: boolean) =>
      ["projects", includeInactive ?? false] as const,
  },
  reports: {
    list: (f?: Filters) => ["reports", f] as const,
    detail: (id: string) => ["report", id] as const,
    versions: (id: string) => ["report", id, "versions"] as const,
    version: (id: string, versionNumber: number) =>
      ["report", id, "versions", versionNumber] as const,
    availableWeeks: () => ["reports", "weeks", "available"] as const,
  },
  team: {
    reports: (f?: Filters) => ["team-reports", f] as const,
    report: (id: string) => ["team-report", id] as const,
    version: (id: string, versionNumber: number) =>
      ["team-report", id, "versions", versionNumber] as const,
    statusMatrix: (week?: string) => ["status-matrix", week ?? "current"] as const,
    sections: (section: string, week?: string) =>
      ["team-sections", section, week ?? "current"] as const,
  },
  reviews: {
    history: (reportId: string) => ["review-history", reportId] as const,
  },
  analytics: {
    all: () => ["analytics"] as const,
    summary: (week?: string) => ["analytics", "summary", week ?? "current"] as const,
    trends: (f?: Filters) => ["analytics", "trends", f] as const,
    statusByMember: (f?: Filters) => ["analytics", "status-by-member", f] as const,
    byProject: (f?: Filters) => ["analytics", "by-project", f] as const,
    timeByType: (f?: Filters) => ["analytics", "time-by-type", f] as const,
    activity: (limit?: number) => ["analytics", "activity", limit ?? 20] as const,
  },
};
