"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { formatWeekRange, type ActivityItem } from "@cadence/shared"
import { formatDateTime } from "@/components/report/version-drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { getActivity } from "@/lib/api/analytics"
import { queryKeys } from "@/lib/query-keys"

export function ActivityFeed({ limit = 12 }: { limit?: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.analytics.activity(limit),
    queryFn: () => getActivity(limit),
  })

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (isError || !data) {
    return <p className="text-destructive text-sm">Could not load activity.</p>
  }
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Nothing has happened yet.</p>
    )
  }

  return (
    <ul className="divide-y">
      {data.map((item) => (
        <li key={item.id} className="py-2.5 text-sm">
          <Link
            href={`/team/reports/${item.reportPublicId}/review`}
            className="hover:underline"
          >
            {describe(item)}
          </Link>
          <p className="text-muted-foreground text-xs">
            {formatDateTime(item.createdAt)}
          </p>
        </li>
      ))}
    </ul>
  )
}

function describe(item: ActivityItem): string {
  const week = formatWeekRange(item.weekStart)
  if (item.kind === "SUBMISSION") {
    return `${item.actorName} submitted their report for ${week}`
  }
  const verb =
    item.action === "APPROVE" ? "approved" : "requested changes on"
  return `${item.actorName} ${verb} ${item.ownerName}'s report for ${week}`
}
