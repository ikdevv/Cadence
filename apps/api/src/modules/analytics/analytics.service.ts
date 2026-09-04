import { Injectable } from '@nestjs/common';
import { decimalToNumber } from '../../common/utils/decimal.js';
import { isWeekOver, shiftWeek, toWeekStart } from '../../common/utils/week.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { ReportStatus } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Default span of the trend and workload charts. */
const DEFAULT_RANGE_WEEKS = 6;

const num = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value.toString());
};

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

  /**
   * One row per active member for the week, including "not yet started" —
   * which is not a stored status but the absence of a report row, so it comes
   * from a left join out of the user table rather than from a phantom status
   * or a nightly job creating empty reports.
   */
  async statusMatrix(week?: string) {
    const weekStart = toWeekStart(week ?? new Date());

    const rows = await this.prisma.$queryRaw<
      {
        userId: string;
        name: string;
        email: string;
        status: string;
        reportId: string | null;
        submittedAt: Date | null;
      }[]
    >`
      SELECT
        u."id"                              AS "userId",
        u."name"                            AS "name",
        u."email"                           AS "email",
        COALESCE(r."status"::text, 'NOT_STARTED') AS "status",
        r."id"                              AS "reportId",
        v."submittedAt"                     AS "submittedAt"
      FROM "User" u
      LEFT JOIN "Report" r
        ON r."userId" = u."id" AND r."weekStart" = ${weekStart}::date
      LEFT JOIN "ReportVersion" v
        ON v."id" = r."currentVersionId"
      WHERE u."isActive" = true AND u."role" = 'MEMBER'
      ORDER BY u."name" ASC
    `;

    return rows.map((row) => ({
      userId: row.userId,
      name: row.name,
      email: row.email,
      status: row.status,
      reportId: row.reportId,
      submittedAt: row.submittedAt ? asDate(row.submittedAt).toISOString() : null,
    }));
  }

  async summary(week?: string) {
    const weekStart = toWeekStart(week ?? new Date());

    const [activeMembers, submitted, needsCorrection, approved, openBlockers] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { isActive: true, role: 'MEMBER' } }),
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

    const notStarted = Math.max(activeMembers - submitted, 0);

    return {
      weekStart: dateOnly(weekStart),
      activeMembers,
      submitted,
      notStarted,
      // "Late" only means anything once the week itself has finished.
      late: isWeekOver(weekStart) ? notStarted : 0,
      needsCorrection,
      approved,
      complianceRate: activeMembers === 0 ? 0 : submitted / activeMembers,
      openBlockers,
    };
  }

  /** Completed vs. total tasks per week, team-wide or for one member. */
  async trends(from?: string, to?: string, userId?: string) {
    const { start, end } = this.range(from, to);
    const userFilter = userId
      ? Prisma.sql`AND r."userId" = ${userId}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      { weekStart: Date; completed: bigint; total: bigint }[]
    >`
      SELECT r."weekStart" AS "weekStart",
             COUNT(*) FILTER (WHERE t."status" = 'COMPLETED') AS "completed",
             COUNT(t."id") AS "total"
      FROM "Report" r
      JOIN "ReportVersion" v ON v."id" = r."currentVersionId"
      LEFT JOIN "Task" t ON t."versionId" = v."id"
      WHERE r."weekStart" BETWEEN ${start}::date AND ${end}::date
        AND r."status" <> 'DRAFT'
        ${userFilter}
      GROUP BY r."weekStart"
      ORDER BY r."weekStart" ASC
    `;

    return rows.map((row) => ({
      weekStart: dateOnly(row.weekStart),
      completedTasks: num(row.completed),
      totalTasks: num(row.total),
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

    const rows = await this.prisma.$queryRaw<
      {
        projectId: string;
        name: string;
        code: string;
        color: string;
        hoursSpent: string | null;
        taskCount: bigint;
      }[]
    >`
      SELECT p."id"   AS "projectId",
             p."name" AS "name",
             p."code" AS "code",
             p."color" AS "color",
             COALESCE(SUM(t."hoursSpent"), 0) AS "hoursSpent",
             COUNT(t."id") AS "taskCount"
      FROM "Project" p
      JOIN "Report" r ON r."projectId" = p."id"
      JOIN "ReportVersion" v ON v."id" = r."currentVersionId"
      LEFT JOIN "Task" t ON t."versionId" = v."id"
      WHERE r."weekStart" BETWEEN ${start}::date AND ${end}::date
        AND r."status" <> 'DRAFT'
      GROUP BY p."id", p."name", p."code", p."color"
      ORDER BY "hoursSpent" DESC
    `;

    return rows.map((row) => ({
      projectId: row.projectId,
      name: row.name,
      code: row.code,
      color: row.color,
      hoursSpent: num(row.hoursSpent),
      taskCount: num(row.taskCount),
    }));
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
              id: true,
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
              id: true,
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
        reportId: review.report.id,
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
        reportId: version.report.id,
        weekStart: dateOnly(version.report.weekStart),
        comment: null,
        createdAt: version.submittedAt!.toISOString(),
      })),
    ];

    return items
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  /**
   * One section pulled from every member's current version for a week, side by
   * side — all the blockers for a week, for example.
   */
  async sections(section: 'blockers' | 'achievements' | 'tasks', week?: string) {
    const weekStart = toWeekStart(week ?? new Date());

    const reports = await this.prisma.report.findMany({
      where: { weekStart, status: { not: 'DRAFT' } },
      orderBy: { user: { name: 'asc' } },
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, code: true, color: true } },
        currentVersion: {
          include: {
            blockers: { orderBy: { sortOrder: 'asc' } },
            achievements: { orderBy: { sortOrder: 'asc' } },
            tasks: { orderBy: { sortOrder: 'asc' } },
          },
        },
      },
    });

    return reports.map((report) => {
      const version = report.currentVersion;
      const items =
        section === 'blockers'
          ? (version?.blockers ?? []).map((blocker) => ({
              id: blocker.id,
              text: blocker.description,
              flagged: blocker.isKeyIssue,
            }))
          : section === 'achievements'
            ? (version?.achievements ?? []).map((achievement) => ({
                id: achievement.id,
                text: achievement.description,
                flagged: achievement.isKeyHighlight,
              }))
            : (version?.tasks ?? []).map((task) => ({
                id: task.id,
                text: task.name,
                flagged: task.status === 'BLOCKED',
              }));

      return {
        reportId: report.id,
        user: report.user,
        project: report.project,
        status: report.status,
        items,
      };
    });
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
