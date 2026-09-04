"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { formatWeek, type Paginated, type ReportListItem } from "@cadence/shared"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
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
import { useFilterParams } from "@/lib/hooks/use-filter-params"
import { queryKeys } from "@/lib/query-keys"

const PAGE_SIZE = 10

export function ReportListTable() {
  const { get, set } = useFilterParams()
  const page = Number(get("page") ?? 1)

  const filters = {
    week: get("week"),
    userId: get("userId"),
    projectId: get("projectId"),
    status: get("status"),
    page,
    pageSize: PAGE_SIZE,
  }

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.team.reports(filters),
    queryFn: () =>
      apiClient.get<Paginated<ReportListItem>>(
        `/team/reports${toQueryString(filters)}`,
      ),
  })

  if (isLoading) return <Skeleton className="h-64 w-full" />
  if (isError || !data) {
    return <p className="text-destructive text-sm">Could not load reports.</p>
  }
  if (data.data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground text-sm">
          No submitted reports match these filters.
        </p>
      </div>
    )
  }

  const totalPages = Math.max(Math.ceil(data.total / PAGE_SIZE), 1)

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[44rem]">
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Week</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Tasks</TableHead>
              <TableHead className="text-right">Versions</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((report) => (
              <TableRow key={report.id}>
                <TableCell className="font-medium">
                  {report.user ? (
                    <Link
                      href={`/team/members/${report.user.id}`}
                      className="hover:underline"
                    >
                      {report.user.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{formatWeek(report.weekStart)}</TableCell>
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
                  {report.versionCount}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/team/reports/${report.id}/review`}>
                      {report.status === "SUBMITTED" ? "Review" : "View"}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {data.total} report{data.total === 1 ? "" : "s"} · page {data.page} of{" "}
          {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => set({ page: String(page - 1) })}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => set({ page: String(page + 1) })}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
