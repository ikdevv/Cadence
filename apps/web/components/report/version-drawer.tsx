"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { formatWeek, type VersionSummary } from "@cadence/shared"
import { ReportView } from "@/components/report/report-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { getReportVersion } from "@/lib/api/reports"
import { getTeamReportVersion } from "@/lib/api/team"
import { queryKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"

/**
 * The version history, built once and used by the member's detail page, the
 * member's edit page and the manager's review page. `basePath` is the only
 * difference between them: members read their own report, managers read through
 * /team, and each path is guarded separately on the API.
 */
export function VersionDrawer({
  reportId,
  versions,
  currentVersionNumber,
  basePath = "/reports",
  trigger,
}: {
  reportId: string
  versions: VersionSummary[]
  currentVersionNumber?: number
  basePath?: "/reports" | "/team/reports"
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<number | null>(null)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSelected(null)
      }}
    >
      <SheetTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            Previous versions ({versions.length})
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Version history</SheetTitle>
          <SheetDescription>
            Every submitted version is kept exactly as it was reviewed.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-8">
          <ul className="space-y-2">
            {versions.map((version) => {
              const isCurrent = version.versionNumber === currentVersionNumber
              return (
                <li key={version.id}>
                  <button
                    type="button"
                    onClick={() =>
                      setSelected(
                        selected === version.versionNumber
                          ? null
                          : version.versionNumber,
                      )
                    }
                    className={cn(
                      "hover:bg-muted flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors",
                      selected === version.versionNumber && "border-primary",
                    )}
                  >
                    <span className="font-medium">
                      Version {version.versionNumber}
                    </span>
                    <span className="flex items-center gap-2">
                      {isCurrent && <Badge variant="secondary">Current</Badge>}
                      <span className="text-muted-foreground text-xs">
                        {version.submittedAt
                          ? `Submitted ${formatDateTime(version.submittedAt)}`
                          : "Not submitted"}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {selected !== null && (
            <VersionContent
              reportId={reportId}
              versionNumber={selected}
              basePath={basePath}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** Version content is fetched on demand — the list itself carries metadata only. */
function VersionContent({
  reportId,
  versionNumber,
  basePath,
}: {
  reportId: string
  versionNumber: number
  basePath: "/reports" | "/team/reports"
}) {
  const isTeam = basePath === "/team/reports"
  const { data, isLoading, isError } = useQuery({
    queryKey: isTeam
      ? queryKeys.team.version(reportId, versionNumber)
      : queryKeys.reports.version(reportId, versionNumber),
    queryFn: () =>
      isTeam
        ? getTeamReportVersion(reportId, versionNumber)
        : getReportVersion(reportId, versionNumber),
  })

  if (isLoading) {
    return (
      <div className="space-y-2 border-t pt-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }
  if (isError || !data) {
    return (
      <p className="text-destructive border-t pt-4 text-sm">
        Could not load that version.
      </p>
    )
  }

  return (
    <div className="border-t pt-4">
      <p className="text-muted-foreground mb-4 text-sm">
        Viewing version {data.versionNumber}
        {data.submittedAt
          ? `, submitted ${formatDateTime(data.submittedAt)}`
          : " (not yet submitted)"}
      </p>
      <ReportView version={data} />
    </div>
  )
}

export function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export { formatWeek }
