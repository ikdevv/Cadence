import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { paginate, type Paginated } from '../../common/dto/pagination.dto.js';
import { decimalToNumber } from '../../common/utils/decimal.js';
import { shiftWeek, toWeekStart } from '../../common/utils/week.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateReportDto } from './dto/create-report.dto.js';
import type { ListReportsDto } from './dto/list-reports.dto.js';
import type { ReportContentDto } from './dto/report-content.dto.js';
import {
  ReportVersionsService,
  versionInclude,
} from './report-versions.service.js';

const projectSelect = {
  id: true,
  name: true,
  code: true,
  color: true,
} satisfies Prisma.ProjectSelect;

const userSelect = {
  id: true,
  name: true,
  email: true,
} satisfies Prisma.UserSelect;

/** How many past weeks the "new report" week picker offers. */
const WEEK_PICKER_DEPTH = 8;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly versions: ReportVersionsService,
    private readonly events: EventEmitter2,
  ) {}

  /**
   * The ownership rule, in one place: userId comes from the JWT and is filtered
   * in the where clause rather than fetched and compared afterwards. A miss is
   * a 404, not a 403 — a member should not be able to probe which report IDs
   * exist.
   */
  async assertOwnedReport(reportId: string, userId: string) {
    const report = await this.prisma.report.findFirst({
      where: { id: reportId, userId },
      select: { id: true, status: true, currentVersionId: true },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }

  async listOwn(userId: string, query: ListReportsDto): Promise<Paginated<unknown>> {
    const { page, pageSize, skip, take } = paginate(query);

    const where: Prisma.ReportWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.from || query.to
        ? {
            weekStart: {
              ...(query.from ? { gte: toWeekStart(query.from) } : {}),
              ...(query.to ? { lte: toWeekStart(query.to) } : {}),
            },
          }
        : {}),
    };

    // Both queries in one transaction so the count matches the page.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        skip,
        take,
        orderBy: { weekStart: 'desc' },
        include: {
          project: { select: projectSelect },
          currentVersion: { include: { tasks: true } },
          _count: { select: { versions: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);

    return { data: rows.map((row) => this.toListItem(row)), page, pageSize, total };
  }

  async create(userId: string, dto: CreateReportDto) {
    const weekStart = toWeekStart(dto.weekStart);

    // Duplicate weeks hit @@unique([userId, weekStart]) and surface as a 409
    // through the Prisma exception filter.
    return this.prisma.$transaction(async (tx) => {
      const report = await tx.report.create({
        data: { userId, projectId: dto.projectId, weekStart, status: 'DRAFT' },
      });

      const version = await tx.reportVersion.create({
        data: { reportId: report.id, versionNumber: 1, submittedAt: null },
      });

      return tx.report.update({
        where: { id: report.id },
        data: { currentVersionId: version.id },
        select: { id: true, weekStart: true, status: true },
      });
    });
  }

  /** Own report with its current content and the comment explaining a rejection. */
  async findOwn(reportId: string, userId: string) {
    await this.assertOwnedReport(reportId, userId);
    return this.findDetail(reportId);
  }

  async findDetail(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        project: { select: projectSelect },
        user: { select: userSelect },
        currentVersion: { include: versionInclude },
        _count: { select: { versions: true } },
      },
    });
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const [latestReview, versions] = await Promise.all([
      this.latestReviewFor(reportId),
      this.versions.listVersions(reportId),
    ]);

    return {
      id: report.id,
      weekStart: report.weekStart.toISOString().slice(0, 10),
      status: report.status,
      project: report.project,
      user: report.user,
      currentVersion: report.currentVersion
        ? this.versions.serialize(report.currentVersion)
        : null,
      latestReview,
      versionCount: report._count.versions,
      versions,
    };
  }

  async updateContent(reportId: string, userId: string, dto: ReportContentDto) {
    await this.assertOwnedReport(reportId, userId);
    const version = await this.versions.getEditableVersion(reportId);
    this.assertKeyFlags(dto);

    await this.prisma.$transaction(async (tx) => {
      // Children are replaced wholesale rather than diffed: the payload is a
      // handful of rows, the version is private to one user, and nothing
      // outside the version references these ids.
      await tx.task.deleteMany({ where: { versionId: version.id } });
      await tx.blocker.deleteMany({ where: { versionId: version.id } });
      await tx.achievement.deleteMany({ where: { versionId: version.id } });
      await tx.hoursEntry.deleteMany({ where: { versionId: version.id } });

      await tx.reportVersion.update({
        where: { id: version.id },
        data: {
          notes: dto.notes ?? null,
          links: dto.links ?? null,
          nextWeekPlan: dto.nextWeekPlan ?? null,
          tasks: {
            create: dto.tasks.map((task, index) => ({
              ...task,
              sortOrder: index,
            })),
          },
          blockers: {
            create: dto.blockers.map((blocker, index) => ({
              description: blocker.description,
              isKeyIssue: blocker.isKeyIssue ?? false,
              sortOrder: index,
            })),
          },
          achievements: {
            create: dto.achievements.map((achievement, index) => ({
              description: achievement.description,
              isKeyHighlight: achievement.isKeyHighlight ?? false,
              sortOrder: index,
            })),
          },
          hours: { create: dto.hours },
        },
      });

      if (dto.projectId) {
        await tx.report.update({
          where: { id: reportId },
          data: { projectId: dto.projectId },
        });
      }
    });

    return this.findDetail(reportId);
  }

  /**
   * Freezes the version being edited. Submit never creates a version — only
   * requestChanges does — or every cycle would leave an empty phantom version
   * behind.
   */
  async submit(reportId: string, userId: string) {
    const report = await this.assertOwnedReport(reportId, userId);
    if (report.status !== 'DRAFT' && report.status !== 'NEEDS_CORRECTION') {
      throw new ConflictException(
        `Cannot submit a report in status ${report.status}`,
      );
    }

    const version = await this.versions.getEditableVersion(reportId);
    await this.assertContentComplete(version.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.reportVersion.update({
        where: { id: version.id },
        data: { submittedAt: new Date() },
      });
      await tx.report.update({
        where: { id: reportId },
        data: { status: 'SUBMITTED', currentVersionId: version.id },
      });
    });

    this.events.emit('report.submitted', {
      reportId,
      userId,
      versionId: version.id,
    });

    return this.findDetail(reportId);
  }

  async remove(reportId: string, userId: string) {
    const report = await this.assertOwnedReport(reportId, userId);
    if (report.status !== 'DRAFT') {
      throw new ConflictException('Only a draft report can be deleted');
    }
    await this.prisma.report.update({
      where: { id: reportId },
      data: { currentVersionId: null },
    });
    await this.prisma.report.delete({ where: { id: reportId } });
    return { id: reportId };
  }

  async listVersions(reportId: string, userId: string) {
    await this.assertOwnedReport(reportId, userId);
    return this.versions.listVersions(reportId);
  }

  async findVersion(reportId: string, userId: string, versionNumber: number) {
    await this.assertOwnedReport(reportId, userId);
    return this.versions.findVersionByNumber(reportId, versionNumber);
  }

  /** Weeks in the recent past with no report yet, for the new-report picker. */
  async availableWeeks(userId: string) {
    const earliest = shiftWeek(new Date(), -(WEEK_PICKER_DEPTH - 1));
    const taken = await this.prisma.report.findMany({
      where: { userId, weekStart: { gte: earliest } },
      select: { weekStart: true },
    });
    const takenKeys = new Set(
      taken.map((row) => row.weekStart.toISOString().slice(0, 10)),
    );

    return Array.from({ length: WEEK_PICKER_DEPTH }, (_, index) =>
      shiftWeek(new Date(), -index).toISOString().slice(0, 10),
    ).filter((week) => !takenKeys.has(week));
  }

  /**
   * Reads the newest review comment. Writes to ReviewAction belong to the
   * reviews module alone; this read is here so a member's own report detail is
   * a single request.
   */
  async latestReviewFor(reportId: string) {
    const review = await this.prisma.reviewAction.findFirst({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { name: true } },
        version: { select: { versionNumber: true } },
      },
    });
    if (!review) return null;

    return {
      id: review.id,
      action: review.action,
      comment: review.comment,
      reviewerName: review.reviewer.name,
      versionNumber: review.version.versionNumber,
      createdAt: review.createdAt.toISOString(),
    };
  }

  /** The submit-time rules that a lenient draft save deliberately skips. */
  private async assertContentComplete(versionId: string) {
    const version = await this.prisma.reportVersion.findUnique({
      where: { id: versionId },
      include: {
        tasks: true,
        blockers: true,
        achievements: true,
      },
    });
    if (!version) {
      throw new NotFoundException('Version not found');
    }
    if (version.tasks.length === 0) {
      throw new BadRequestException('Add at least one task before submitting');
    }
    if (version.blockers.filter((blocker) => blocker.isKeyIssue).length > 1) {
      throw new BadRequestException(
        'Only one blocker can be flagged as the key issue',
      );
    }
    if (
      version.achievements.filter((achievement) => achievement.isKeyHighlight)
        .length > 1
    ) {
      throw new BadRequestException(
        'Only one achievement can be flagged as the key highlight',
      );
    }
  }

  private assertKeyFlags(dto: ReportContentDto) {
    if (dto.blockers.filter((blocker) => blocker.isKeyIssue).length > 1) {
      throw new BadRequestException(
        'Only one blocker can be flagged as the key issue',
      );
    }
    if (
      dto.achievements.filter((achievement) => achievement.isKeyHighlight)
        .length > 1
    ) {
      throw new BadRequestException(
        'Only one achievement can be flagged as the key highlight',
      );
    }
  }

  toListItem(row: {
    id: string;
    weekStart: Date;
    status: string;
    updatedAt: Date;
    project: { id: string; name: string; code: string; color: string };
    user?: { id: string; name: string; email: string };
    currentVersion: { tasks: { hoursSpent: unknown }[] } | null;
    _count: { versions: number };
  }) {
    const tasks = row.currentVersion?.tasks ?? [];
    return {
      id: row.id,
      weekStart: row.weekStart.toISOString().slice(0, 10),
      status: row.status,
      project: row.project,
      ...(row.user ? { user: row.user } : {}),
      taskCount: tasks.length,
      hoursSpent: tasks.reduce(
        (sum, task) => sum + decimalToNumber(task.hoursSpent),
        0,
      ),
      versionCount: row._count.versions,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
