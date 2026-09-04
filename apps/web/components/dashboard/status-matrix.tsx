"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import type { StatusMatrixRow } from "@cadence/shared"
import { StatusBadge } from "@/components/status-badge"
import { Skeleton } from "@/components/ui/skeleton"
import { apiClient, toQueryString } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

/**
 * One row per active member for the selected week. "Not started" is not a
 * stored status — it is the absence of a report row, computed server-side by
 * left-joining active members against the week.
 */
export function StatusMatrix({ week }: { week?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.team.statusMatrix(week),
    queryFn: () =>
      apiClient.get<StatusMatrixRow[]>(
        `/team/status-matrix${toQueryString({ week })}`,
      ),
  })

  if (isLoading) return <Skeleton className="h-40 w-full" />
  if (isError || !data) {
    return (
      <p className="text-destructive text-sm">Could not load the status matrix.</p>
    )
  }
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No active team members yet.
      </p>
    )
  }

  return (
    // A squeezed grid is unreadable on a phone, so it becomes a card list.
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((row) => {
        const content = (
          <span className="flex w-full items-center justify-between gap-3 rounded-md border p-3 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{row.name}</span>
              <span className="text-muted-foreground block truncate text-xs">
                {row.email}
              </span>
            </span>
            <StatusBadge status={row.status} />
          </span>
        )

        return (
          <li key={row.userId}>
            {row.reportId && row.status !== "DRAFT" ? (
              <Link
                href={`/team/reports/${row.reportId}/review`}
                className="hover:bg-muted block rounded-md transition-colors"
              >
                {content}
              </Link>
            ) : (
              // Drafts are private to their owner: visible as a state, not as a link.
              content
            )}
          </li>
        )
      })}
    </ul>
  )
}
