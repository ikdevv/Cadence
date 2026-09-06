import type { ReportChatRequest, ReportChatResponse } from "@cadence/shared"
import { apiClient } from "./client"

export function postReportChat(request: ReportChatRequest) {
  return apiClient.post<ReportChatResponse>("/assistant/report-chat", request)
}
