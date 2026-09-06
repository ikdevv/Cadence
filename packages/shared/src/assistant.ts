export interface ReportChatFilters {
  week?: string;
  from?: string;
  to?: string;
  userId?: string;
  projectId?: string;
  status?: string;
}

export interface ReportChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ReportChatRequest {
  question: string;
  filters?: ReportChatFilters;
  history?: ReportChatMessage[];
}

export interface ReportChatResponse {
  answer: string;
}
