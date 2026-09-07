import type { ReviewActionType } from "./reports";

export interface SummaryMetrics {
  weekStart: string;
  activeMembers: number;
  submitted: number;
  notStarted: number;
  /** Not submitted and the week has already ended. */
  late: number;
  needsCorrection: number;
  approved: number;
  /** submitted ÷ active members, 0–1. */
  complianceRate: number;
  /** Blockers on the current version of any report for the week that is not yet approved. */
  openBlockers: number;
}

export interface TrendPoint {
  weekStart: string;
  completedTasks: number;
  totalTasks: number;
}

export interface StatusByMemberRow {
  userId: string;
  name: string;
  DRAFT: number;
  SUBMITTED: number;
  NEEDS_CORRECTION: number;
  APPROVED: number;
}

export interface ProjectWorkloadRow {
  projectId: string;
  name: string;
  code: string;
  color: string;
  hoursSpent: number;
  taskCount: number;
}

export interface TimeByTypeRow {
  taskType: string;
  hours: number;
}

export interface ActivityItem {
  id: string;
  kind: "REVIEW" | "SUBMISSION";
  action: ReviewActionType | null;
  actorName: string;
  ownerName: string;
  /** The URL-facing identifier — use this, not an internal id, when linking to the report. */
  reportPublicId: string;
  weekStart: string;
  comment: string | null;
  createdAt: string;
}

export interface MemberStats {
  totalReports: number;
  approved: number;
  needsCorrection: number;
  submitted: number;
  draft: number;
  avgHoursPerWeek: number;
  onTimeSubmissionRate: number;
  /** Share of reports that needed at least one correction. */
  correctionRate: number;
  topProjects: { name: string; reportCount: number }[];
}
