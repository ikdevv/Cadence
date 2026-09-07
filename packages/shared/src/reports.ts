import { z } from "zod";

// Mirrors the Prisma enums in apps/api/prisma/reports.prisma — keep in sync
// manually, since the generated Prisma client isn't importable from this package.
export const ReportStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "NEEDS_CORRECTION",
  "APPROVED",
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

/** Not a stored status: it is the absence of a report row for a (user, week). */
export const MATRIX_NOT_STARTED = "NOT_STARTED" as const;

export const TaskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const TaskStatusSchema = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "BLOCKED",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskTypeSchema = z.enum([
  "DEVELOPMENT",
  "TESTING",
  "MEETINGS",
  "DOCUMENTATION",
  "OTHER",
]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const TASK_TYPES = TaskTypeSchema.options;

export const ReviewActionTypeSchema = z.enum(["APPROVE", "REQUEST_CHANGES"]);
export type ReviewActionType = z.infer<typeof ReviewActionTypeSchema>;

// --- report content -------------------------------------------------------
// The structure is identical for every user and not customizable, so it is
// defined once here and used by the report form and the read-only view.

export const TaskSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Task name is required").max(200),
  priority: TaskPrioritySchema,
  status: TaskStatusSchema,
  plannedPct: z.number().int().min(0).max(100),
  actualPct: z.number().int().min(0).max(100),
  hoursPlanned: z.number().min(0).max(200),
  hoursSpent: z.number().min(0).max(200),
  deliverable: z.string().max(500).optional(),
});
export type TaskInput = z.infer<typeof TaskSchema>;

export const BlockerSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Describe the blocker").max(1000),
  isKeyIssue: z.boolean().default(false),
});
export type BlockerInput = z.infer<typeof BlockerSchema>;

export const AchievementSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Describe the achievement").max(1000),
  isKeyHighlight: z.boolean().default(false),
});
export type AchievementInput = z.infer<typeof AchievementSchema>;

export const HoursEntrySchema = z.object({
  taskType: TaskTypeSchema,
  hours: z.number().min(0).max(80),
});
export type HoursEntryInput = z.infer<typeof HoursEntrySchema>;

export const ReportContentSchema = z
  .object({
    projectId: z.string().min(1, "Pick a project"),
    tasks: z.array(TaskSchema).min(1, "Add at least one task"),
    nextWeekPlan: z.string().max(3000).optional(),
    blockers: z.array(BlockerSchema).max(20),
    achievements: z.array(AchievementSchema).max(20),
    hours: z.array(HoursEntrySchema).max(5),
    notes: z.string().max(3000).optional(),
    links: z.string().max(2000).optional(),
  })
  // "Flag one as the key issue / key achievement" from the brief. The API
  // enforces the same two rules; this copy is for immediate form feedback.
  .refine((v) => v.blockers.filter((b) => b.isKeyIssue).length <= 1, {
    message: "Only one blocker can be flagged as the key issue",
    path: ["blockers"],
  })
  .refine((v) => v.achievements.filter((a) => a.isKeyHighlight).length <= 1, {
    message: "Only one achievement can be flagged as the key highlight",
    path: ["achievements"],
  });
export type ReportContentInput = z.infer<typeof ReportContentSchema>;

export const CreateReportSchema = z.object({
  projectId: z.string().min(1, "Pick a project"),
  weekStart: z.string().min(1, "Pick a week"),
});
export type CreateReportInput = z.infer<typeof CreateReportSchema>;

// --- read shapes ----------------------------------------------------------

export interface ProjectRef {
  id: string;
  name: string;
  code: string;
  color: string;
}

export interface UserRef {
  id: string;
  /** The URL-facing identifier — use this, not `id`, when linking to this user. */
  publicId: string;
  name: string;
  email: string;
}

export interface ReportVersionContent {
  id: string;
  versionNumber: number;
  submittedAt: string | null;
  notes: string | null;
  links: string | null;
  nextWeekPlan: string | null;
  tasks: (TaskInput & { id: string })[];
  blockers: (BlockerInput & { id: string })[];
  achievements: (AchievementInput & { id: string })[];
  hours: HoursEntryInput[];
}

export interface VersionSummary {
  id: string;
  versionNumber: number;
  submittedAt: string | null;
  createdAt: string;
}

export interface ReviewEntry {
  id: string;
  action: ReviewActionType;
  comment: string | null;
  reviewerName: string;
  versionNumber: number;
  createdAt: string;
}

export interface ReportListItem {
  id: string;
  /** The URL-facing identifier — use this, not `id`, when linking to this report. */
  publicId: string;
  weekStart: string;
  status: ReportStatus;
  project: ProjectRef;
  user?: UserRef;
  taskCount: number;
  hoursSpent: number;
  versionCount: number;
  updatedAt: string;
}

export interface ReportDetail {
  id: string;
  /** The URL-facing identifier — use this, not `id`, when linking to this report. */
  publicId: string;
  weekStart: string;
  status: ReportStatus;
  project: ProjectRef;
  user: UserRef;
  currentVersion: ReportVersionContent | null;
  latestReview: ReviewEntry | null;
  versionCount: number;
  versions: VersionSummary[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const REPORT_STATUSES = ReportStatusSchema.options;

/** Statuses a member may still edit — mirrors the API's editable-version rule. */
export const EDITABLE_STATUSES: ReportStatus[] = ["DRAFT", "NEEDS_CORRECTION"];
