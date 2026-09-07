"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { EDITABLE_STATUSES, formatWeekRange } from "@cadence/shared"
import { ReportView } from "@/components/report/report-view"
import { ReviewCommentBanner } from "@/components/report/review-comment-banner"
import { VersionDrawer } from "@/components/report/version-drawer"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getReport } from "@/lib/api/reports"
import { queryKeys } from "@/lib/query-keys"

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.reports.detail(id),
    queryFn: () => getReport(id),
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (isError || !data) {
    return <p className="text-destructive text-sm">Could not load this report.</p>
  }

  const editable = EDITABLE_STATUSES.includes(data.status)

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
            {data.project.name} · version {data.currentVersion?.versionNumber} of{" "}
            {data.versionCount}
          </p>
        </div>
        <div className="flex gap-2">
          {data.versionCount > 1 && (
            <VersionDrawer
              reportId={data.publicId}
              versions={data.versions}
              currentVersionNumber={data.currentVersion?.versionNumber}
            />
          )}
          {editable && (
            <Button asChild>
              <Link href={`/reports/${data.publicId}/edit`}>Edit</Link>
            </Button>
          )}
        </div>
      </div>

      <ReviewCommentBanner review={data.latestReview} />

      <ReportView version={data.currentVersion} />
    </div>
  )
}
