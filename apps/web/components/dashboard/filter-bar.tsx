"use client"

import { useQuery } from "@tanstack/react-query"
import {
  formatWeek,
  recentWeeks,
  REPORT_STATUSES,
  type Project,
} from "@cadence/shared"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient } from "@/lib/api-client"
import { useFilterParams } from "@/lib/hooks/use-filter-params"
import { queryKeys } from "@/lib/query-keys"
import { statusConfig } from "@/lib/status-config"

const ALL = "ALL"
const WEEK_CHOICES = 8

export interface TeamMemberOption {
  id: string
  name: string
}

export function FilterBar({
  members = [],
  showStatus = true,
}: {
  members?: TeamMemberOption[]
  showStatus?: boolean
}) {
  const { get, set } = useFilterParams()

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(true),
    queryFn: () => apiClient.get<Project[]>("/projects?includeInactive=true"),
  })

  const weeks = recentWeeks(WEEK_CHOICES)
    .map((week) => week.toISOString().slice(0, 10))
    .reverse()

  const hasFilters = ["week", "userId", "projectId", "status"].some((key) =>
    get(key),
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={get("week") ?? ALL}
        onValueChange={(value) => set({ week: value, page: undefined })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Week" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All weeks</SelectItem>
          {weeks.map((week) => (
            <SelectItem key={week} value={week}>
              Week of {formatWeek(week)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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

      {showStatus && (
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
      )}

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
