import { BadRequestException, Injectable } from '@nestjs/common';
import { shiftWeek, toWeekStart } from '../../common/utils/week.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { ReportsService } from '../reports/reports.service.js';
import { TeamReportsService } from '../reviews/team-reports.service.js';
import type { ReportChatFiltersDto } from './dto/report-chat.dto.js';

/** Caps prompt size and Hugging Face token usage — the dashboard list page paginates for the same reason. */
const MAX_REPORTS_IN_CONTEXT = 15;

/** Mirrors AnalyticsService's private default range so the label shown to the assistant matches the data it actually receives. */
const DEFAULT_RANGE_WEEKS = 6;

const dateOnly = (date: Date) => date.toISOString().slice(0, 10);

export interface ReportChatContext {
  empty: boolean;
  dateRange: { start: string; end: string };
  filters: { member: string | null; project: string | null; status: string | null };
  totalMatchingReports?: number;
  reportsIncluded?: number;
  summary?: Awaited<ReturnType<AnalyticsService['summary']>> | null;
  statusByMember?: Awaited<ReturnType<AnalyticsService['statusByMember']>>;
  workloadByProject?: Awaited<ReturnType<AnalyticsService['byProject']>>;
  timeByType?: Awaited<ReturnType<AnalyticsService['timeByType']>>;
  reports?: ReturnType<AssistantContextService['minimize']>[];
}

/**
 * Builds the ONLY data the model ever sees. Every field here goes through
 * TeamReportsService/ReportsService/AnalyticsService, which already exclude
 * drafts and gate on Report.currentVersionId — this class adds no new query
 * path into the database, only a minimizing/shaping step on top of reads the
 * manager could already make from the dashboard and review pages.
 *
 * No internal ids, emails, publicIds, tokens, or credentials are included.
 */
@Injectable()
export class AssistantContextService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly reports: ReportsService,
    private readonly teamReports: TeamReportsService,
  ) {}

  async build(filters: ReportChatFiltersDto): Promise<ReportChatContext> {
    const { range, labels } = await this.resolveAndValidate(filters);

    const { data: rows, total } = await this.teamReports.list({
      week: filters.week,
      from: filters.from,
      to: filters.to,
      userId: filters.userId,
      projectId: filters.projectId,
      status: filters.status,
      page: 1,
      pageSize: MAX_REPORTS_IN_CONTEXT,
    });

    if (rows.length === 0) {
      return { empty: true, dateRange: range, filters: labels };
    }

    const [details, statusByMember, workloadByProject, timeByType, summary] = await Promise.all([
      Promise.all(rows.map((row) => this.reports.findDetail(row.id))),
      this.analytics.statusByMember(range.start, range.end),
      this.analytics.byProject(range.start, range.end),
      this.analytics.timeByType(range.start, range.end),
      filters.week ? this.analytics.summary(filters.week) : Promise.resolve(null),
    ]);

    return {
      empty: false,
      dateRange: range,
      filters: labels,
      totalMatchingReports: total,
      reportsIncluded: details.length,
      summary,
      statusByMember,
      workloadByProject,
      timeByType,
      reports: details.map((detail) => this.minimize(detail)),
    };
  }

  /** Strips a full report detail down to the fields a manager's question could actually need. */
  private minimize(detail: Awaited<ReturnType<ReportsService['findDetail']>>) {
    const version = detail.currentVersion;
    return {
      member: detail.user.name,
      project: detail.project.name,
      weekStart: detail.weekStart,
      status: detail.status,
      notes: version?.notes ?? null,
      nextWeekPlan: version?.nextWeekPlan ?? null,
      tasks: (version?.tasks ?? []).map((task) => ({
        name: task.name,
        status: task.status,
        priority: task.priority,
        hoursSpent: task.hoursSpent,
        deliverable: task.deliverable ?? null,
      })),
      blockers: (version?.blockers ?? []).map((blocker) => ({
        description: blocker.description,
        isKeyIssue: blocker.isKeyIssue,
      })),
      achievements: (version?.achievements ?? []).map((achievement) => ({
        description: achievement.description,
        isKeyHighlight: achievement.isKeyHighlight,
      })),
    };
  }

  /**
   * The authorization boundary for filters: a client-supplied userId/projectId
   * is never trusted at face value, only used once it resolves to a real row.
   * Everything else (date validity, week/from/to precedence, draft exclusion)
   * is already enforced inside TeamReportsService/AnalyticsService.
   */
  private async resolveAndValidate(filters: ReportChatFiltersDto) {
    if (filters.status === 'DRAFT') {
      throw new BadRequestException('Draft reports are private and cannot be summarized here.');
    }
    if (filters.from && filters.to && toWeekStart(filters.from) > toWeekStart(filters.to)) {
      throw new BadRequestException('"from" must not be after "to".');
    }

    let member: { name: string } | null = null;
    if (filters.userId) {
      member = await this.prisma.user.findFirst({
        where: { id: filters.userId, role: 'MEMBER' },
        select: { name: true },
      });
      if (!member) {
        throw new BadRequestException('Unknown member filter.');
      }
    }

    let project: { name: string } | null = null;
    if (filters.projectId) {
      project = await this.prisma.project.findUnique({
        where: { id: filters.projectId },
        select: { name: true },
      });
      if (!project) {
        throw new BadRequestException('Unknown project filter.');
      }
    }

    const end = filters.week
      ? toWeekStart(filters.week)
      : filters.to
        ? toWeekStart(filters.to)
        : toWeekStart(new Date());
    const start = filters.week
      ? end
      : filters.from
        ? toWeekStart(filters.from)
        : shiftWeek(end, -(DEFAULT_RANGE_WEEKS - 1));

    return {
      range: { start: dateOnly(start), end: dateOnly(end) },
      labels: {
        member: member?.name ?? null,
        project: project?.name ?? null,
        status: filters.status ?? null,
      },
    };
  }
}
