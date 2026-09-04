"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  formatWeek,
  REPORT_STATUSES,
  type Paginated,
  type Project,
  type ReportListItem,
} from "@cadence/shared"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { apiClient, toQueryString } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import { statusConfig } from "@/lib/status-config"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10
const ALL = "ALL"

export default function ReportHistoryPage() {
  const [status, setStatus] = React.useState<string>(ALL)
  const [projectId, setProjectId] = React.useState<string>(ALL)
  const [page, setPage] = React.useState(1)

  const filters = {
    page,
    pageSize: PAGE_SIZE,
    status: status === ALL ? undefined : status,
    projectId: projectId === ALL ? undefined : projectId,
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.reports.list(filters),
    queryFn: () =>
      apiClient.get<Paginated<ReportListItem>>(
        `/reports${toQueryString(filters)}`,
      ),
  })

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => apiClient.get<Project[]>("/projects"),
  })

  const totalPages = data ? Math.max(Math.ceil(data.total / PAGE_SIZE), 1) : 1

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My reports</h1>
          <p className="text-muted-foreground text-sm">
            Every week you have reported on, newest first.
          </p>
        </div>
        <Button asChild>
          <Link href="/reports/new">New report</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {REPORT_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {statusConfig[value].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={projectId}
          onValueChange={(value) => {
            setProjectId(value)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All projects</SelectItem>
            {(projects ?? []).map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {isError && (
        <p className="text-destructive text-sm">Could not load your reports.</p>
      )}

      {data && data.data.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground mb-4 text-sm">
            No reports match this view yet.
          </p>
          <Button asChild>
            <Link href="/reports/new">Create this week&apos;s report</Link>
          </Button>
        </div>
      )}

      {data && data.data.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <Table className="min-w-[46rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Versions</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((report) => {
                  const editable =
                    report.status === "DRAFT" ||
                    report.status === "NEEDS_CORRECTION"
                  return (
                    <TableRow
                      key={report.id}
                      className={cn(
                        report.status === "NEEDS_CORRECTION" &&
                          "bg-amber-50/60 dark:bg-amber-950/20",
                      )}
                    >
                      <TableCell className="font-medium">
                        {formatWeek(report.weekStart)}
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: report.project.color }}
                          />
                          {report.project.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={report.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {report.taskCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {report.hoursSpent}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {report.versionCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={
                              editable
                                ? `/reports/${report.id}/edit`
                                : `/reports/${report.id}`
                            }
                          >
                            {editable ? "Edit" : "View"}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {data.total} report{data.total === 1 ? "" : "s"} · page {data.page}{" "}
              of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
