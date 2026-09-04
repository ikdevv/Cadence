"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { formatWeek, type ProjectRef, type ReportStatus } from "@cadence/shared"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { apiClient, toQueryString } from "@/lib/api-client"
import { useFilterParams } from "@/lib/hooks/use-filter-params"
import { queryKeys } from "@/lib/query-keys"

type Section = "blockers" | "achievements" | "tasks"

interface SectionRow {
  reportId: string
  user: { id: string; name: string }
  project: ProjectRef
  status: ReportStatus
  items: { id: string; text: string; flagged: boolean }[]
}

export default function SectionsPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <Sections />
    </React.Suspense>
  )
}

/** One section from every member's current version for a week, side by side. */
function Sections() {
  const { get } = useFilterParams()
  const week = get("week")
  const [section, setSection] = React.useState<Section>("blockers")

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.team.sections(section, week),
    queryFn: () =>
      apiClient.get<SectionRow[]>(
        `/team/sections${toQueryString({ section, week })}`,
      ),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Across the team</h1>
        <p className="text-muted-foreground text-sm">
          {week ? `Week of ${formatWeek(week)}` : "Current week"} · one section
          from every member&apos;s latest version
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={section} onValueChange={(value) => setSection(value as Section)}>
          <TabsList>
            <TabsTrigger value="blockers">Blockers</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>
        </Tabs>
        <FilterBar showStatus={false} />
      </div>

      {isLoading && <Skeleton className="h-64 w-full" />}
      {isError && (
        <p className="text-destructive text-sm">Could not load this view.</p>
      )}
      {data?.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-muted-foreground text-sm">
            No submitted reports for this week yet.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((row) => (
          <Card key={row.reportId}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <Link
                  href={`/team/reports/${row.reportId}/review`}
                  className="hover:underline"
                >
                  {row.user.name}
                </Link>
                <StatusBadge status={row.status} />
              </CardTitle>
              <p className="text-muted-foreground text-xs">{row.project.name}</p>
            </CardHeader>
            <CardContent>
              {row.items.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nothing recorded.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {row.items.map((item) => (
                    <li key={item.id} className="flex gap-2">
                      {item.flagged && (
                        <Badge variant="outline" className="shrink-0 border-amber-400">
                          Key
                        </Badge>
                      )}
                      <span>{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
