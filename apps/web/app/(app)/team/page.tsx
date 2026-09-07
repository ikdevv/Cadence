"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { formatWeekRange } from "@cadence/shared"
import { ReportChatWidget } from "@/components/assistant/report-chat-widget"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { ReportListTable } from "@/components/dashboard/report-list-table"
import { Skeleton } from "@/components/ui/skeleton"
import { getSummary } from "@/lib/api/analytics"
import { listUsers } from "@/lib/api/users"
import { useDashboardFilters } from "@/lib/hooks/use-dashboard-filters"
import { queryKeys } from "@/lib/query-keys"

export default function TeamDashboardPage() {
  return (
    <React.Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <TeamDashboard />
    </React.Suspense>
  )
}

function TeamDashboard() {
  const { get } = useDashboardFilters()
  const week = get("week")

  const { data: members } = useQuery({
    queryKey: queryKeys.users.list({ role: "MEMBER" }),
    queryFn: () =>
      listUsers<{ data: { id: string; name: string }[] }>({
        role: "MEMBER",
        pageSize: 100,
      }),
  })

  const { data: summary } = useQuery({
    queryKey: queryKeys.analytics.summary(week),
    queryFn: () => getSummary(week),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Team dashboard</h1>
        <p className="text-muted-foreground text-sm">
          {summary
            ? formatWeekRange(summary.weekStart)
            : "Loading the current week"}
        </p>
      </div>

      <FilterBar members={members?.data ?? []} />

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

      <ReportChatWidget />
    </div>
  )
}
