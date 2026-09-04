import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import { decimalToNumber } from '../../common/utils/decimal.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Every read of report content pulls the same children in the same order. */
export const versionInclude = {
  tasks: { orderBy: { sortOrder: 'asc' } },
  blockers: { orderBy: { sortOrder: 'asc' } },
  achievements: { orderBy: { sortOrder: 'asc' } },
  hours: { orderBy: { taskType: 'asc' } },
} satisfies Prisma.ReportVersionInclude;

type VersionWithChildren = Prisma.ReportVersionGetPayload<{
  include: typeof versionInclude;
}>;

@Injectable()
export class ReportVersionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The single rule governing every content write: content can only be written
   * to the version where submittedAt IS NULL. A submitted version is frozen
   * forever, which is what makes a report editable in DRAFT and
   * NEEDS_CORRECTION and locked in SUBMITTED and APPROVED — with no status
   * switch statement anywhere.
   */
  async getEditableVersion(reportId: string) {
    const version = await this.prisma.reportVersion.findFirst({
      where: { reportId, submittedAt: null },
    });
    if (!version) {
      throw new ConflictException(
        'This report is under review and cannot be edited.',
      );
    }
    return version;
  }

  /**
   * Copies a reviewed version into a fresh editable one so the member reopens
   * their report pre-filled rather than blank, while the reviewed version stays
   * frozen and readable.
   *
   * versionNumber + 1 is safe under @@unique([reportId, versionNumber]):
   * two concurrent request-changes calls collide on the constraint and one
   * fails, which is the correct outcome.
   */
  async cloneVersion(tx: Prisma.TransactionClient, sourceId: string) {
    const source = await tx.reportVersion.findUniqueOrThrow({
      where: { id: sourceId },
      include: versionInclude,
    });

    const strip = <T extends { id: string; versionId: string }>(rows: T[]) =>
      rows.map(({ id: _id, versionId: _versionId, ...rest }) => rest);

    return tx.reportVersion.create({
      data: {
        reportId: source.reportId,
        versionNumber: source.versionNumber + 1,
        submittedAt: null, // editable
        notes: source.notes,
        links: source.links,
        nextWeekPlan: source.nextWeekPlan,
        tasks: { create: strip(source.tasks) },
        blockers: { create: strip(source.blockers) },
        achievements: { create: strip(source.achievements) },
        hours: { create: strip(source.hours) },
      },
    });
  }

  async listVersions(reportId: string) {
    const versions = await this.prisma.reportVersion.findMany({
      where: { reportId },
      orderBy: { versionNumber: 'desc' },
      select: {
        id: true,
        versionNumber: true,
        submittedAt: true,
        createdAt: true,
      },
    });

    return versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      submittedAt: version.submittedAt?.toISOString() ?? null,
      createdAt: version.createdAt.toISOString(),
    }));
  }

  async findVersionByNumber(reportId: string, versionNumber: number) {
    const version = await this.prisma.reportVersion.findUnique({
      where: { reportId_versionNumber: { reportId, versionNumber } },
      include: versionInclude,
    });
    if (!version) {
      throw new NotFoundException('Version not found');
    }
    return this.serialize(version);
  }

  async findById(versionId: string) {
    return this.prisma.reportVersion.findUnique({
      where: { id: versionId },
      include: versionInclude,
    });
  }

  serialize(version: VersionWithChildren) {
    return {
      id: version.id,
      versionNumber: version.versionNumber,
      submittedAt: version.submittedAt?.toISOString() ?? null,
      notes: version.notes,
      links: version.links,
      nextWeekPlan: version.nextWeekPlan,
      tasks: version.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        priority: task.priority,
        status: task.status,
        plannedPct: task.plannedPct,
        actualPct: task.actualPct,
        hoursPlanned: decimalToNumber(task.hoursPlanned),
        hoursSpent: decimalToNumber(task.hoursSpent),
        deliverable: task.deliverable ?? undefined,
      })),
      blockers: version.blockers.map((blocker) => ({
        id: blocker.id,
        description: blocker.description,
        isKeyIssue: blocker.isKeyIssue,
      })),
      achievements: version.achievements.map((achievement) => ({
        id: achievement.id,
        description: achievement.description,
        isKeyHighlight: achievement.isKeyHighlight,
      })),
      hours: version.hours.map((entry) => ({
        taskType: entry.taskType,
        hours: decimalToNumber(entry.hours),
      })),
    };
  }
}
