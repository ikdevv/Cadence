import { apiClient } from "./client";

export function approveReview(reportId: string, comment?: string) {
  return apiClient.post(`/reviews/${reportId}/approve`, { comment });
}

export function requestReviewChanges(reportId: string, comment: string) {
  return apiClient.post(`/reviews/${reportId}/request-changes`, { comment });
}
