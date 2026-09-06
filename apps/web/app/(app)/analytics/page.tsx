"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { recentWeeks } from "@cadence/shared";
import { MagnitudeBarChart } from "@/components/charts/magnitude-bar-chart";
import { StatusByMemberChart } from "@/components/charts/status-by-member-chart";
import { TasksTrendChart } from "@/components/charts/tasks-trend-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getByProject,
  getStatusByMember,
  getTimeByType,
  getTrends,
} from "@/lib/api/analytics";
import { queryKeys } from "@/lib/query-keys";
import { taskTypeLabels } from "@/lib/status-config";

const RANGES = [
  { value: "6", label: "Last 6 weeks" },
  { value: "12", label: "Last 12 weeks" },
  { value: "26", label: "Last 26 weeks" },
];

export default function AnalyticsPage() {
  const [weeks, setWeeks] = React.useState("6");

  const range = React.useMemo(() => {
    const span = recentWeeks(Number(weeks));
    return {
      from: span[0]!.toISOString().slice(0, 10),
      to: span[span.length - 1]!.toISOString().slice(0, 10),
    };
  }, [weeks]);

  const trends = useQuery({
    queryKey: queryKeys.analytics.trends(range),
    queryFn: () => getTrends(range),
  });
  const byMember = useQuery({
    queryKey: queryKeys.analytics.statusByMember(range),
    queryFn: () => getStatusByMember(range),
  });
  const byProject = useQuery({
    queryKey: queryKeys.analytics.byProject(range),
    queryFn: () => getByProject(range),
  });
  const byType = useQuery({
    queryKey: queryKeys.analytics.timeByType(range),
    queryFn: () => getTimeByType(range),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Every figure reads through each report&apos;s current version, so a
            correction cycle is never counted twice.
          </p>
        </div>
        <Select value={weeks} onValueChange={setWeeks}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TasksTrendChart data={trends.data} isLoading={trends.isLoading} />
        <StatusByMemberChart
          data={byMember.data}
          isLoading={byMember.isLoading}
        />
        <MagnitudeBarChart
          title="Workload by project"
          description="Hours logged on the current version of each report."
          data={byProject.data?.map((row) => ({
            label: row.name,
            value: row.hoursSpent,
          }))}
          isLoading={byProject.isLoading}
          unit=" h"
          tableHead={["Project", "Hours"]}
        />
        <MagnitudeBarChart
          title="Time by task type"
          description="Where the team's hours actually went."
          data={byType.data?.map((row) => ({
            label: taskTypeLabels[row.taskType] ?? row.taskType,
            value: row.hours,
          }))}
          isLoading={byType.isLoading}
          unit=" h"
          tableHead={["Task type", "Hours"]}
        />
      </div>
    </div>
  );
}
