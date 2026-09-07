"use client"

import { useQuery } from "@tanstack/react-query"
import { REPORT_STATUSES, toWeekStartString } from "@cadence/shared"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { WeekPicker } from "@/components/ui/week-picker"
import { listProjects } from "@/lib/api/projects"
import { useDashboardFilters } from "@/lib/hooks/use-dashboard-filters"
import { queryKeys } from "@/lib/query-keys"
import { statusConfig } from "@/lib/status-config"

const ALL = "ALL"

export interface TeamMemberOption {
  id: string
  name: string
}

export function FilterBar({
  members = [],
}: {
  members?: TeamMemberOption[]
}) {
  const { get, set } = useDashboardFilters()

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(true),
    queryFn: () => listProjects(true),
  })

  const hasFilters = ["week", "userId", "projectId", "status"].some((key) =>
    get(key),
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <WeekPicker
        value={get("week") ?? null}
        onChange={(week) =>
          set({ week: toWeekStartString(week), page: undefined })
        }
        onClear={() => set({ week: undefined, page: undefined })}
        placeholder="All weeks"
        className="w-56"
      />

      {members.length > 0 && (
        <Select
          value={get("userId") ?? ALL}
          onValueChange={(value) => set({ userId: value, page: undefined })}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All members</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={get("projectId") ?? ALL}
        onValueChange={(value) => set({ projectId: value, page: undefined })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All projects</SelectItem>
          {(projects ?? []).map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={get("status") ?? ALL}
        onValueChange={(value) => set({ status: value, page: undefined })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {REPORT_STATUSES.filter((status) => status !== "DRAFT").map(
            (status) => (
              <SelectItem key={status} value={status}>
                {statusConfig[status].label}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            set({
              week: undefined,
              userId: undefined,
              projectId: undefined,
              status: undefined,
              page: undefined,
            })
          }
        >
          Clear
        </Button>
      )}
    </div>
  )
}
