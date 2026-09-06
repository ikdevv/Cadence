import type {
  Paginated,
  ReportDetail,
  ReportListItem,
  ReportVersionContent,
} from "@cadence/shared";
import { apiClient, toQueryString } from "./client";

export function listReports(
  filters?: Record<string, string | number | undefined | null>,
) {
  return apiClient.get<Paginated<ReportListItem>>(
    `/reports${toQueryString(filters ?? {})}`,
  );
}

export function getReport(id: string) {
  return apiClient.get<ReportDetail>(`/reports/${id}`);
}

export function getReportVersion(id: string, versionNumber: number) {
  return apiClient.get<ReportVersionContent>(
    `/reports/${id}/versions/${versionNumber}`,
  );
}

export function getAvailableWeeks() {
  return apiClient.get<string[]>("/reports/weeks/available");
}

export function createReport(data: { projectId: string; weekStart: string }) {
  return apiClient.post<{ id: string; publicId: string }>("/reports", data);
}

export function updateReportContent(id: string, data: unknown) {
  return apiClient.patch<ReportDetail>(`/reports/${id}/content`, data);
}

export function submitReport(id: string) {
  return apiClient.post<ReportDetail>(`/reports/${id}/submit`);
}
