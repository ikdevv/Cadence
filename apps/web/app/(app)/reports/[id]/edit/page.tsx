"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { EDITABLE_STATUSES, formatWeekRange } from "@cadence/shared"
import { DeleteReportButton } from "@/components/report/delete-report-button"
import { ReportForm } from "@/components/report/report-form"
import { ReviewCommentBanner } from "@/components/report/review-comment-banner"
import { VersionDrawer } from "@/components/report/version-drawer"
import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { listProjects } from "@/lib/api/projects"
import { getReport } from "@/lib/api/reports"
import { queryKeys } from "@/lib/query-keys"

export default function EditReportPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.reports.detail(id),
    queryFn: () => getReport(id),
  })

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => listProjects(),
  })

  // A submitted or approved report has no editable version, so send the member
  // to the read-only page rather than rendering a form that cannot save.
  const locked = data && !EDITABLE_STATUSES.includes(data.status)
  React.useEffect(() => {
    if (locked) router.replace(`/reports/${id}`)
  }, [locked, id, router])

  if (isLoading || !projects) return <Skeleton className="h-96 w-full" />
  if (isError || !data) {
    return <p className="text-destructive text-sm">Could not load this report.</p>
  }
  if (locked) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold">
              {formatWeekRange(data.weekStart)}
            </h1>
            <StatusBadge status={data.status} withIcon />
          </div>
          <p className="text-muted-foreground text-sm">
            Editing version {data.currentVersion?.versionNumber} of{" "}
            {data.versionCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data.versionCount > 1 && (
            <VersionDrawer
              reportId={data.publicId}
              versions={data.versions}
              currentVersionNumber={data.currentVersion?.versionNumber}
            />
          )}
          {data.status === "DRAFT" && (
            <DeleteReportButton
              reportId={data.publicId}
              weekLabel={formatWeekRange(data.weekStart)}
              onDeleted={() => router.push("/reports")}
            />
          )}
        </div>
      </div>

      <ReviewCommentBanner review={data.latestReview} />

      <ReportForm report={data} projects={projects} />
    </div>
  )
}
