"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toWeekStartString } from "@cadence/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeekPicker } from "@/components/ui/week-picker";
import { ApiError } from "@/lib/api/client";
import { listProjects } from "@/lib/api/projects";
import { createReport, getAvailableWeeks } from "@/lib/api/reports";
import { queryKeys } from "@/lib/query-keys";

/** The week + project fields for creating a report, rendered inside `NewReportDialog`. */
export function NewReportForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [projectId, setProjectId] = React.useState("");
  const [pickedWeek, setPickedWeek] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const { data: projects } = useQuery({
    queryKey: queryKeys.projects.list(),
    queryFn: () => listProjects(),
  });

  // Only weeks that do not already have a report — one report per person per week.
  const { data: weeks, isLoading: weeksLoading } = useQuery({
    queryKey: queryKeys.reports.availableWeeks(),
    queryFn: () => getAvailableWeeks(),
  });

  // Defaults to the most recent week without a report, without syncing state.
  const weekStart = pickedWeek || weeks?.[0] || "";

  const create = useMutation({
    mutationFn: () => createReport({ projectId, weekStart }),
    onSuccess: (report) => {
      onCreated?.();
      router.push(`/reports/${report.publicId}/edit`);
    },
    onError: (err) =>
      setError(
        err instanceof ApiError ? err.message : "Could not create the report.",
      ),
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="week">Week</Label>
        <WeekPicker
          id="week"
          value={weekStart || null}
          onChange={(week) => setPickedWeek(toWeekStartString(week))}
          allowedWeeks={weeks}
          placeholder={weeksLoading ? "Loading..." : "Pick a week"}
          disabled={weeksLoading || weeks?.length === 0}
        />
        {weeks?.length === 0 && (
          <p className="text-muted-foreground text-xs">
            Every recent week already has a report.
          </p>
        )}
      </div>

      <div className="space-y-2 w-full">
        <Label htmlFor="project">Project</Label>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger id="project" className="w-full">
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
          setError(null);
          create.mutate();
        }}
      >
        {create.isPending ? "Creating..." : "Create report"}
      </Button>
    </div>
  );
}
