import type { Paginated, ReportListItem, ReportVersionContent } from "@cadence/shared";
import { apiClient, toQueryString } from "./client";

export function listTeamReports(
  filters?: Record<string, string | number | undefined | null>,
) {
  return apiClient.get<Paginated<ReportListItem>>(
    `/team/reports${toQueryString(filters ?? {})}`,
  );
}

export function getTeamReport<T = unknown>(id: string) {
  return apiClient.get<T>(`/team/reports/${id}`);
}

export function getTeamReportVersion(id: string, versionNumber: number) {
  return apiClient.get<ReportVersionContent>(
    `/team/reports/${id}/versions/${versionNumber}`,
  );
}
