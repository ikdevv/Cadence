import type {
  ActivityItem,
  ProjectWorkloadRow,
  StatusByMemberRow,
  SummaryMetrics,
  TimeByTypeRow,
  TrendPoint,
} from "@cadence/shared";
import { apiClient, toQueryString } from "./client";

export function getSummary(week?: string) {
  return apiClient.get<SummaryMetrics>(
    `/analytics/summary${toQueryString({ week })}`,
  );
}

export function getTrends(range: { from: string; to: string }) {
  return apiClient.get<TrendPoint[]>(`/analytics/trends${toQueryString(range)}`);
}

export function getStatusByMember(range: { from: string; to: string }) {
  return apiClient.get<StatusByMemberRow[]>(
    `/analytics/status-by-member${toQueryString(range)}`,
  );
}

export function getByProject(range: { from: string; to: string }) {
  return apiClient.get<ProjectWorkloadRow[]>(
    `/analytics/by-project${toQueryString(range)}`,
  );
}

export function getTimeByType(range: { from: string; to: string }) {
  return apiClient.get<TimeByTypeRow[]>(
    `/analytics/time-by-type${toQueryString(range)}`,
  );
}

export function getActivity(limit = 12) {
  return apiClient.get<ActivityItem[]>(`/analytics/activity?limit=${limit}`);
}
