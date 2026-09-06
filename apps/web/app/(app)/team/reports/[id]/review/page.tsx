"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { formatWeekRange, type ReportDetail, type ReviewEntry } from "@cadence/shared"
import { ReportView } from "@/components/report/report-view"
import { formatDateTime, VersionDrawer } from "@/components/report/version-drawer"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { ApiError } from "@/lib/api/client"
import { approveReview, requestReviewChanges } from "@/lib/api/reviews"
import { getTeamReport, getTeamReportVersion } from "@/lib/api/team"
import { queryKeys } from "@/lib/query-keys"

type TeamReportDetail = ReportDetail & { reviewHistory: ReviewEntry[] }

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [selectedVersion, setSelectedVersion] = React.useState<number | null>(null)
  const [comment, setComment] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.team.report(id),
    queryFn: () => getTeamReport<TeamReportDetail>(id),
  })

  const viewingPast =
    selectedVersion !== null &&
    selectedVersion !== data?.currentVersion?.versionNumber

  const pastVersion = useQuery({
    queryKey: queryKeys.team.version(id, selectedVersion ?? 0),
    queryFn: () => getTeamReportVersion(id, selectedVersion ?? 0),
    enabled: viewingPast,
  })

  /** Everything a review touches, invalidated together. */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.team.report(id) })
    queryClient.invalidateQueries({ queryKey: ["team-reports"] })
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all() })
    queryClient.invalidateQueries({ queryKey: queryKeys.reviews.history(id) })
  }

  const approve = useMutation({
    mutationFn: () => approveReview(id, comment.trim() || undefined),
    onSuccess: () => {
      setComment("")
      setError(null)
      invalidate()
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Could not approve."),
  })

  const requestChanges = useMutation({
    mutationFn: () => requestReviewChanges(id, comment.trim()),
    onSuccess: () => {
      setComment("")
      setError(null)
      invalidate()
    },
    onError: (err) =>
      setError(
        err instanceof ApiError ? err.message : "Could not request changes.",
      ),
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (isError || !data) {
    return <p className="text-destructive text-sm">Could not load this report.</p>
  }

  const canReview = data.status === "SUBMITTED" && !viewingPast
  const shownVersion = viewingPast ? pastVersion.data ?? null : data.currentVersion

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{data.user.name}</h1>
            <StatusBadge status={data.status} withIcon />
          </div>
          <p className="text-muted-foreground text-sm">
            {formatWeekRange(data.weekStart)} · {data.project.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/team/members/${data.user.publicId}`}>Member profile</Link>
          </Button>
          <VersionDrawer
            reportId={data.publicId}
            versions={data.versions}
            currentVersionNumber={data.currentVersion?.versionNumber}
            basePath="/team/reports"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {viewingPast && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
              Viewing version {selectedVersion} of {data.versionCount}. Review
              actions are disabled until you switch back to the current version.
            </div>
          )}
          {viewingPast && pastVersion.isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : (
            <ReportView version={shownVersion} />
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-muted-foreground text-xs font-medium">
                  Version
                </label>
                <Select
                  value={String(
                    selectedVersion ?? data.currentVersion?.versionNumber ?? 1,
                  )}
                  onValueChange={(value) => setSelectedVersion(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {data.versions.map((version) => (
                      <SelectItem
                        key={version.id}
                        value={String(version.versionNumber)}
                      >
                        Version {version.versionNumber}
                        {version.versionNumber ===
                        data.currentVersion?.versionNumber
                          ? " (current)"
                          : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                rows={4}
                placeholder="Explain what needs correcting, or leave a note with your approval."
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                disabled={!canReview}
              />

              {error && <p className="text-destructive text-sm">{error}</p>}

              {data.status !== "SUBMITTED" && (
                <p className="text-muted-foreground text-sm">
                  {data.status === "APPROVED"
                    ? "This report is approved. Approval is final."
                    : "Waiting on the member to resubmit."}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <Button
                  disabled={!canReview || approve.isPending}
                  onClick={() => approve.mutate()}
                >
                  {approve.isPending ? "Approving..." : "Approve"}
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={!canReview || comment.trim().length < 5}
                    >
                      Request changes
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send this back for correction?</DialogTitle>
                      <DialogDescription>
                        {data.user.name} gets an editable copy of this version
                        with your comment attached. The version you are looking
                        at now stays exactly as it is.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          onClick={() => requestChanges.mutate()}
                          disabled={requestChanges.isPending}
                        >
                          Request changes
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <p className="text-muted-foreground text-xs">
                A request for changes needs at least a few words of explanation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comment history</CardTitle>
            </CardHeader>
            <CardContent>
              {data.reviewHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No review comments yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.reviewHistory.map((entry) => (
                    <li key={entry.id} className="border-b pb-3 last:border-0">
                      <p className="text-sm font-medium">
                        {entry.action === "APPROVE"
                          ? "Approved"
                          : "Changes requested"}{" "}
                        · v{entry.versionNumber}
                      </p>
                      {entry.comment && (
                        <p className="mt-1 text-sm whitespace-pre-wrap">
                          {entry.comment}
                        </p>
                      )}
                      <p className="text-muted-foreground mt-1 text-xs">
                        {entry.reviewerName} · {formatDateTime(entry.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
