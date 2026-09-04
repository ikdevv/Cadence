import {
  CheckCircle2,
  CircleDashed,
  FileText,
  MessageSquareWarning,
  type LucideIcon,
} from "lucide-react"

export type MatrixStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "NEEDS_CORRECTION"
  | "APPROVED"
  | "NOT_STARTED"

/**
 * One map for every surface that shows a status: badges, matrix cells, filter
 * chips and chart series all read from here, so the colours never drift apart.
 */
export const statusConfig: Record<
  MatrixStatus,
  { label: string; className: string; dot: string; chart: string; icon: LucideIcon }
> = {
  DRAFT: {
    label: "Draft",
    className:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
    chart: "#94a3b8",
    icon: FileText,
  },
  SUBMITTED: {
    label: "Submitted",
    className:
      "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
    dot: "bg-blue-500",
    chart: "#2563eb",
    icon: CircleDashed,
  },
  NEEDS_CORRECTION: {
    label: "Needs correction",
    className:
      "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
    dot: "bg-amber-500",
    chart: "#d97706",
    icon: MessageSquareWarning,
  },
  APPROVED: {
    label: "Approved",
    className:
      "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    dot: "bg-emerald-500",
    chart: "#059669",
    icon: CheckCircle2,
  },
  NOT_STARTED: {
    label: "Not started",
    className:
      "border-dashed border-slate-300 bg-transparent text-slate-500 dark:border-slate-700 dark:text-slate-400",
    dot: "bg-transparent border border-slate-400",
    chart: "#cbd5e1",
    icon: CircleDashed,
  },
}

export const taskStatusLabels: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
}

export const taskPriorityLabels: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
}

export const taskTypeLabels: Record<string, string> = {
  DEVELOPMENT: "Development",
  TESTING: "Testing",
  MEETINGS: "Meetings",
  DOCUMENTATION: "Documentation",
  OTHER: "Other",
}
