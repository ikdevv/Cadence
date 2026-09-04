export const queryKeys = {
  users: {
    active: () => ["users", "active"] as const,
  },
  invitations: {
    list: (status?: string) => ["invitations", status ?? "all"] as const,
    validate: (token: string) => ["invitations", "validate", token] as const,
  },
};
