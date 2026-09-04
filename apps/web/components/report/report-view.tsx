import type { ReportVersionContent } from "@cadence/shared"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  taskPriorityLabels,
  taskStatusLabels,
  taskTypeLabels,
} from "@/lib/status-config"
import { cn } from "@/lib/utils"

/**
 * Renders one version, read-only. It has no idea whether it is showing the
 * current version to its owner, the version under review to a manager, or a
 * frozen historical version inside the drawer — which is why the same component
 * serves all three.
 */
export function ReportView({ version }: { version: ReportVersionContent | null }) {
  if (!version) {
    return (
      <p className="text-muted-foreground text-sm">
        This report has no content yet.
      </p>
    )
  }

  const totalSpent = version.tasks.reduce((sum, task) => sum + task.hoursSpent, 0)

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading>Tasks</SectionHeading>
        {version.tasks.length === 0 ? (
          <Empty>No tasks recorded.</Empty>
        ) : (
          // Seven columns will not fit a phone: scroll horizontally with the
          // task name pinned so the row stays readable.
          <div className="overflow-x-auto">
            <Table className="min-w-[46rem]">
              <TableHeader>
                <TableRow>
                  <TableHead className="bg-background sticky left-0">Task</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Planned %</TableHead>
                  <TableHead className="text-right">Actual %</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Deliverable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {version.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="bg-background sticky left-0 font-medium">
                      {task.name}
                    </TableCell>
                    <TableCell>{taskPriorityLabels[task.priority]}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          task.status === "BLOCKED" &&
                            "border-amber-300 text-amber-800 dark:text-amber-300",
                          task.status === "COMPLETED" &&
                            "border-emerald-300 text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        {taskStatusLabels[task.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {task.plannedPct}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {task.actualPct}%
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {task.hoursSpent} / {task.hoursPlanned}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {task.deliverable || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <SectionHeading>Blockers</SectionHeading>
          {version.blockers.length === 0 ? (
            <Empty>No blockers raised.</Empty>
          ) : (
            <ul className="space-y-2">
              {version.blockers.map((blocker) => (
                <li
                  key={blocker.id}
                  className={cn(
                    "rounded-md border p-3 text-sm",
                    blocker.isKeyIssue &&
                      "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
                  )}
                >
                  {blocker.isKeyIssue && (
                    <Badge variant="outline" className="mb-2 border-amber-400">
                      Key issue
                    </Badge>
                  )}
                  <p>{blocker.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionHeading>Achievements</SectionHeading>
          {version.achievements.length === 0 ? (
            <Empty>No achievements recorded.</Empty>
          ) : (
            <ul className="space-y-2">
              {version.achievements.map((achievement) => (
                <li
                  key={achievement.id}
                  className={cn(
                    "rounded-md border p-3 text-sm",
                    achievement.isKeyHighlight &&
                      "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
                  )}
                >
                  {achievement.isKeyHighlight && (
                    <Badge variant="outline" className="mb-2 border-emerald-400">
                      Key highlight
                    </Badge>
                  )}
                  <p>{achievement.description}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <SectionHeading>Hours by task type</SectionHeading>
          {version.hours.length === 0 ? (
            <Empty>No hours breakdown given.</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {version.hours.map((entry) => (
                <li
                  key={entry.taskType}
                  className="flex justify-between border-b py-1.5 last:border-0"
                >
                  <span>{taskTypeLabels[entry.taskType]}</span>
                  <span className="tabular-nums">{entry.hours} h</span>
                </li>
              ))}
              <li className="text-muted-foreground flex justify-between pt-1.5 text-xs">
                <span>Total hours on tasks</span>
                <span className="tabular-nums">{totalSpent} h</span>
              </li>
            </ul>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <SectionHeading>Plan for next week</SectionHeading>
            <p className="text-sm whitespace-pre-wrap">
              {version.nextWeekPlan || <Empty>Nothing recorded.</Empty>}
            </p>
          </div>
          {version.notes && (
            <div>
              <SectionHeading>Notes</SectionHeading>
              <p className="text-sm whitespace-pre-wrap">{version.notes}</p>
            </div>
          )}
          {version.links && (
            <div>
              <SectionHeading>Links</SectionHeading>
              <p className="text-sm break-all whitespace-pre-wrap">
                {version.links}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
      {children}
    </h3>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground text-sm">{children}</span>
}
