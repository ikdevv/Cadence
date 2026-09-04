"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { formatWeek, type SummaryMetrics } from "@cadence/shared"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { ReportListTable } from "@/components/dashboard/report-list-table"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusMatrix } from "@/components/dashboard/status-matrix"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient, toQueryString } from "@/lib/api-client"
import { useFilterParams } from "@/lib/hooks/use-filter-params"
import { queryKeys } from "@/lib/query-keys"

export default function TeamDashboardPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <TeamDashboard />
    </React.Suspense>
  )
}

function TeamDashboard() {
  const { get } = useFilterParams()
  const week = get("week")

  const { data: members } = useQuery({
    queryKey: queryKeys.users.list({ role: "MEMBER" }),
    queryFn: () =>
      apiClient.get<{ data: { id: string; name: string }[] }>(
        "/users?role=MEMBER&pageSize=100",
      ),
  })

  const { data: summary, isLoading } = useQuery({
    queryKey: queryKeys.analytics.summary(week),
    queryFn: () =>
      apiClient.get<SummaryMetrics>(`/analytics/summary${toQueryString({ week })}`),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {summary
            ? `Week of ${formatWeek(summary.weekStart)}`
            : "Loading the current week"}
        </p>
      </div>

      <FilterBar members={members?.data ?? []} />

      {isLoading && <Skeleton className="h-24 w-full" />}
      {summary && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Submitted"
            value={`${summary.submitted} / ${summary.activeMembers}`}
            hint={`${Math.round(summary.complianceRate * 100)}% compliance`}
            tone="success"
          />
          <StatCard
            label="Not yet started"
            value={summary.notStarted}
            hint="No report row for the week"
          />
          <StatCard
            label="Needs correction"
            value={summary.needsCorrection}
            tone="warning"
          />
          <StatCard
            label="Open blockers"
            value={summary.openBlockers}
            hint="On the current version of any unapproved report this week"
            tone={summary.openBlockers > 0 ? "warning" : "default"}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Who has reported {summary ? `— week of ${formatWeek(summary.weekStart)}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatusMatrix week={week} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold">Reports</h2>
          <ReportListTable />
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Recent activity</h2>
          <ActivityFeed />
        </div>
      </div>
    </div>
  )
}
