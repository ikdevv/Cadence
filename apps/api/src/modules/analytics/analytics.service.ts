import { Injectable } from '@nestjs/common';
import { decimalToNumber } from '../../common/utils/decimal.js';
import { isWeekOver, shiftWeek, toWeekStart } from '../../common/utils/week.js';
import type { ReportStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Default span of the trend and workload charts. */
const DEFAULT_RANGE_WEEKS = 6;

const asDate = (value: Date | string) =>
  value instanceof Date ? value : new Date(value);

const dateOnly = (value: Date | string) =>
  asDate(value).toISOString().slice(0, 10);

/**
 * Every aggregate in here reads through Report.currentVersionId. Aggregating
 * across all versions would double-count every report that went through a
 * correction cycle — this is the one rule the whole module depends on.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(week?: string) {
    const weekStart = toWeekStart(week ?? new Date());

    const [
      activeMembers,
      started,
      submitted,
      needsCorrection,
      approved,
      openBlockers,
    ] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { isActive: true, role: 'MEMBER' } }),
      // Any report row at all, drafts included — the matrix shows a draft as
      // DRAFT, not as "not yet started", so the two surfaces agree.
      this.prisma.report.count({ where: { weekStart } }),
      this.prisma.report.count({
        where: {
          weekStart,
          status: { in: ['SUBMITTED', 'NEEDS_CORRECTION', 'APPROVED'] },
        },
      }),
      this.prisma.report.count({
        where: { weekStart, status: 'NEEDS_CORRECTION' },
      }),
      this.prisma.report.count({ where: { weekStart, status: 'APPROVED' } }),
      // "Open blockers": blockers on the current version of any report for
      // the week that is not yet approved. The brief leaves this undefined,
      // so the definition is stated here and on the dashboard card.
      this.prisma.blocker.count({
        where: {
          version: {
            currentOf: { weekStart, status: { not: 'APPROVED' } },
          },
        },
      }),
    ]);

    // Not yet started: an active member with no report row for the week.
    const notStarted = Math.max(activeMembers - started, 0);

    return {
      weekStart: dateOnly(weekStart),
      activeMembers,
      submitted,
      notStarted,
      // Late: not submitted, and the week itself has already finished.
      late: isWeekOver(weekStart) ? Math.max(activeMembers - submitted, 0) : 0,
      needsCorrection,
      approved,
      complianceRate: activeMembers === 0 ? 0 : submitted / activeMembers,
      openBlockers,
    };
  }

  /** Completed vs. total tasks per week, team-wide or for one member. */
  async trends(from?: string, to?: string, userId?: string) {
    const { start, end } = this.range(from, to);

    const reports = await this.prisma.report.findMany({
      where: {
        weekStart: { gte: start, lte: end },
        status: { not: 'DRAFT' },
        ...(userId ? { userId } : {}),
      },
      select: {
        weekStart: true,
        currentVersion: { select: { tasks: { select: { status: true } } } },
      },
    });

    const byWeek = new Map<string, { completed: number; total: number }>();
    for (const report of reports) {
      const key = dateOnly(report.weekStart);
      const bucket = byWeek.get(key) ?? { completed: 0, total: 0 };
      const tasks = report.currentVersion?.tasks ?? [];
      bucket.total += tasks.length;
      bucket.completed += tasks.filter(
        (task) => task.status === 'COMPLETED',
      ).length;
      byWeek.set(key, bucket);
    }

    return [...byWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, { completed, total }]) => ({
        weekStart,
        completedTasks: completed,
        totalTasks: total,
      }));
  }

  /** Report counts per member per status, for the stacked bar chart. */
  async statusByMember(from?: string, to?: string) {
    const { start, end } = this.range(from, to);

    const rows = await this.prisma.report.groupBy({
      by: ['userId', 'status'],
      where: { weekStart: { gte: start, lte: end }, status: { not: 'DRAFT' } },
      _count: { _all: true },
    });

    const members = await this.prisma.user.findMany({
      where: { isActive: true, role: 'MEMBER' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    return members.map((member) => {
      const forMember = rows.filter((row) => row.userId === member.id);
      const countOf = (status: ReportStatus) =>
        forMember.find((row) => row.status === status)?._count._all ?? 0;

      return {
        userId: member.id,
        name: member.name,
        DRAFT: 0, // drafts are private to their owner and never counted here
        SUBMITTED: countOf('SUBMITTED'),
        NEEDS_CORRECTION: countOf('NEEDS_CORRECTION'),
        APPROVED: countOf('APPROVED'),
      };
    });
  }

  async byProject(from?: string, to?: string) {
    const { start, end } = this.range(from, to);

    const reports = await this.prisma.report.findMany({
      where: { weekStart: { gte: start, lte: end }, status: { not: 'DRAFT' } },
      select: {
        project: { select: { id: true, name: true, code: true, color: true } },
        currentVersion: {
          select: { tasks: { select: { hoursSpent: true } } },
        },
      },
    });

    const byProject = new Map<
      string,
      {
        project: { id: string; name: string; code: string; color: string };
        hoursSpent: number;
        taskCount: number;
      }
    >();
    for (const report of reports) {
      const bucket = byProject.get(report.project.id) ?? {
        project: report.project,
        hoursSpent: 0,
        taskCount: 0,
      };
      const tasks = report.currentVersion?.tasks ?? [];
      bucket.taskCount += tasks.length;
      bucket.hoursSpent += tasks.reduce(
        (sum, task) => sum + decimalToNumber(task.hoursSpent),
        0,
      );
      byProject.set(report.project.id, bucket);
    }

    return [...byProject.values()]
      .map(({ project, hoursSpent, taskCount }) => ({
        projectId: project.id,
        name: project.name,
        code: project.code,
        color: project.color,
        hoursSpent,
        taskCount,
      }))
      .sort((a, b) => b.hoursSpent - a.hoursSpent);
  }

  /** Meetings vs. development and the rest, team-wide. */
  async timeByType(from?: string, to?: string) {
    const { start, end } = this.range(from, to);

    const rows = await this.prisma.hoursEntry.groupBy({
      by: ['taskType'],
      _sum: { hours: true },
      where: {
        version: {
          currentOf: {
            weekStart: { gte: start, lte: end },
            status: { not: 'DRAFT' },
          },
        },
      },
    });

    return rows
      .map((row) => ({
        taskType: row.taskType,
        hours: decimalToNumber(row._sum.hours),
      }))
      .sort((a, b) => b.hours - a.hours);
  }

  /** Reviews and submissions merged into one reverse-chronological feed. */
  async activity(limit = 20) {
    const [reviews, submissions] = await Promise.all([
      this.prisma.reviewAction.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: { select: { name: true } },
          report: {
            select: {
              publicId: true,
              weekStart: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.reportVersion.findMany({
        where: { submittedAt: { not: null } },
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          report: {
            select: {
              publicId: true,
              weekStart: true,
              user: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const items = [
      ...reviews.map((review) => ({
        id: `review-${review.id}`,
        kind: 'REVIEW' as const,
        action: review.action,
        actorName: review.reviewer.name,
        ownerName: review.report.user.name,
        reportPublicId: review.report.publicId,
        weekStart: dateOnly(review.report.weekStart),
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      })),
      ...submissions.map((version) => ({
        id: `submission-${version.id}`,
        kind: 'SUBMISSION' as const,
        action: null,
        actorName: version.report.user.name,
        ownerName: version.report.user.name,
        reportPublicId: version.report.publicId,
        weekStart: dateOnly(version.report.weekStart),
        comment: null,
        createdAt: version.submittedAt!.toISOString(),
      })),
    ];

    return items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  /** Defaults to the last six weeks, both bounds normalized to Mondays. */
  private range(from?: string, to?: string) {
    const end = toWeekStart(to ?? new Date());
    const start = from
      ? toWeekStart(from)
      : shiftWeek(end, -(DEFAULT_RANGE_WEEKS - 1));
    return { start, end };
  }
}
