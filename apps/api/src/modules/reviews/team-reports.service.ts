import { Injectable } from '@nestjs/common';
import { paginate } from '../../common/dto/pagination.dto.js';
import { toWeekStart } from '../../common/utils/week.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportVersionsService } from '../reports/report-versions.service.js';
import { ReportsService } from '../reports/reports.service.js';
import { ReviewsService } from './reviews.service.js';
import type { ListTeamReportsDto } from './dto/list-team-reports.dto.js';

/**
 * The manager's read side. It mirrors the member's report reads but lives under
 * /team/*, behind a different guard, with its own service method — same data,
 * separate paths, no shared handler branching on role.
 */
@Injectable()
export class TeamReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly versions: ReportVersionsService,
    private readonly reviews: ReviewsService,
  ) {}

  async list(query: ListTeamReportsDto) {
    const { page, pageSize, skip, take } = paginate(query);

    const where: Prisma.ReportWhereInput = {
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...this.weekFilter(query),
      // Drafts are private to their owner, so they can never be listed here.
      // A DRAFT status filter degrades to "everything but drafts" rather than
      // opening a hole.
      status:
        query.status && query.status !== 'DRAFT'
          ? query.status
          : { not: 'DRAFT' },
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: [{ weekStart: 'desc' }, { updatedAt: 'desc' }],
        include: {
          project: { select: { id: true, name: true, code: true, color: true } },
          user: { select: { id: true, publicId: true, name: true, email: true } },
          currentVersion: { include: { tasks: true } },
          _count: { select: { versions: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.reports.toListItem(row)),
      page,
      pageSize,
      total,
    };
  }

  /** Everything the review page needs in one request. `publicId` is the URL-facing id. */
  async findOne(publicId: string) {
    const reportId = await this.reports.resolveIdByPublicId(publicId);
    const [detail, reviewHistory] = await Promise.all([
      this.reports.findDetail(reportId),
      this.reviews.history(reportId),
    ]);
    return { ...detail, reviewHistory };
  }

  /** Past version content, loaded on demand by the version selector. */
  async findVersion(publicId: string, versionNumber: number) {
    const reportId = await this.reports.resolveIdByPublicId(publicId);
    return this.versions.findVersionByNumber(reportId, versionNumber);
  }

  /** `week` wins over `from`/`to`; with neither, the caller sees every week. */
  private weekFilter(query: ListTeamReportsDto): Prisma.ReportWhereInput {
    if (query.week) {
      return { weekStart: toWeekStart(query.week) };
    }
    if (query.from || query.to) {
      return {
        weekStart: {
          ...(query.from ? { gte: toWeekStart(query.from) } : {}),
          ...(query.to ? { lte: toWeekStart(query.to) } : {}),
        },
      };
    }
    return {};
  }
}
