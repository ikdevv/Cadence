"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "@tanstack/react-query"
import { formatWeek, type Project } from "@cadence/shared"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { apiClient, ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

export default function NewReportPage() {
  const router = useRouter()
  const [projectId, setProjectId] = React.useState("")
  const [pickedWeek, setPickedWeek] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => apiClient.get<Project[]>("/projects"),
  })

  // Only weeks that do not already have a report — one report per person per week.
  const { data: weeks, isLoading: weeksLoading } = useQuery({
    queryKey: queryKeys.reports.availableWeeks(),
    queryFn: () => apiClient.get<string[]>("/reports/weeks/available"),
  })

  // Defaults to the most recent week without a report, without syncing state.
  const weekStart = pickedWeek || weeks?.[0] || ""

  const create = useMutation({
    mutationFn: () =>
      apiClient.post<{ id: string }>("/reports", { projectId, weekStart }),
    onSuccess: (report) => router.push(`/reports/${report.id}/edit`),
    onError: (err) =>
      setError(
        err instanceof ApiError ? err.message : "Could not create the report.",
      ),
  })

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>New weekly report</CardTitle>
          <CardDescription>
            Pick the week and the project. You can fill in the rest next.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="week">Week</Label>
            <Select value={weekStart} onValueChange={setPickedWeek}>
              <SelectTrigger id="week">
                <SelectValue
                  placeholder={weeksLoading ? "Loading..." : "Pick a week"}
                />
              </SelectTrigger>
              <SelectContent>
                {(weeks ?? []).map((week) => (
                  <SelectItem key={week} value={week}>
                    Week of {formatWeek(week)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {weeks?.length === 0 && (
              <p className="text-muted-foreground text-xs">
                Every recent week already has a report.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Pick a project" />
              </SelectTrigger>
              <SelectContent>
                {(projects ?? []).map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({project.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <Button
            className="w-full"
            disabled={!projectId || !weekStart || create.isPending}
            onClick={() => {
              setError(null)
              create.mutate()
            }}
          >
            {create.isPending ? "Creating..." : "Create report"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
