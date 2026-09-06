import { apiClient, toQueryString } from "./client";

export function getUser<T = unknown>(id: string) {
  return apiClient.get<T>(`/users/${id}`);
}

export function listUsers<T = unknown>(
  query: Record<string, string | number | undefined | null>,
) {
  return apiClient.get<T>(`/users${toQueryString(query)}`);
}
