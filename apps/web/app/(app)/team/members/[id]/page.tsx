"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  formatWeekRange,
  type MemberStats,
  type ProjectRef,
  type ReportStatus,
} from "@cadence/shared"
import { StatCard } from "@/components/dashboard/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getUser } from "@/lib/api/users"
import { queryKeys } from "@/lib/query-keys"

interface MemberProfile {
  user: { id: string; name: string; email: string; role: string; isActive: boolean }
  stats: MemberStats
  recentReports: {
    id: string
    publicId: string
    weekStart: string
    status: ReportStatus
    project: ProjectRef
    taskCount: number
    versionCount: number
  }[]
}

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.users.profile(id),
    queryFn: () => getUser<MemberProfile>(id),
  })

  if (isLoading) return <Skeleton className="h-96 w-full" />
  if (isError || !data) {
    return <p className="text-destructive text-sm">Could not load this member.</p>
  }

  const pct = (value: number) => `${Math.round(value * 100)}%`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{data.user.name}</h1>
        <p className="text-muted-foreground text-sm">
          {data.user.email} · {data.user.role}
          {data.user.isActive ? "" : " · deactivated"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Reports" value={data.stats.totalReports} />
        <StatCard
          label="Approved"
          value={data.stats.approved}
          tone="success"
        />
        <StatCard
          label="Correction rate"
          value={pct(data.stats.correctionRate)}
          hint="Reports that needed at least one correction"
          tone={data.stats.correctionRate > 0.4 ? "warning" : "default"}
        />
        <StatCard
          label="On time"
          value={pct(data.stats.onTimeSubmissionRate)}
          hint="Submitted before the week ended"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent reports</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentReports.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No submitted reports yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[34rem]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Tasks</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>{formatWeekRange(report.weekStart)}</TableCell>
                        <TableCell>{report.project.code}</TableCell>
                        <TableCell>
                          <StatusBadge status={report.status} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {report.taskCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/team/reports/${report.publicId}/review`}>
                              Open
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">At a glance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Average hours / week" value={data.stats.avgHoursPerWeek} />
            <Row label="Awaiting review" value={data.stats.submitted} />
            <Row label="In correction" value={data.stats.needsCorrection} />
            <Row label="Drafts" value={data.stats.draft} />
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wide uppercase">
                Top projects
              </p>
              {data.stats.topProjects.length === 0 ? (
                <p className="text-muted-foreground">None yet.</p>
              ) : (
                <ul className="space-y-1">
                  {data.stats.topProjects.map((project) => (
                    <li key={project.name} className="flex justify-between">
                      <span>{project.name}</span>
                      <span className="tabular-nums">{project.reportCount}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
