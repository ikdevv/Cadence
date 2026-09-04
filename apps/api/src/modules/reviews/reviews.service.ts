import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportVersionsService } from '../reports/report-versions.service.js';
import { nextStatus } from './status-machine.js';

/**
 * Review actions only. This service can reach Report.status and ReviewAction —
 * it has no access to Task, Blocker, Achievement or HoursEntry, so there is no
 * code path from a manager's request to a report-content write. That is the
 * "managers cannot rewrite content" rule, enforced structurally rather than by
 * an if-check.
 */
@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly versions: ReportVersionsService,
    private readonly events: EventEmitter2,
  ) {}

  async approve(reportId: string, reviewerId: string, comment?: string) {
    const report = await this.loadReport(reportId);
    const status = nextStatus(report.status, 'APPROVE'); // throws unless SUBMITTED

    // No new version: the approved version stays frozen as currentVersionId.
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.reviewAction.create({
        data: {
          reportId,
          versionId: report.currentVersionId!,
          reviewerId,
          action: 'APPROVE',
          comment: comment ?? null,
        },
      });
      return tx.report.update({ where: { id: reportId }, data: { status } });
    });

    this.events.emit('report.reviewed', {
      reportId,
      action: 'APPROVE',
      reviewerId,
    });
    return { id: updated.id, status: updated.status };
  }

  /**
   * Two things happen atomically: the comment is recorded against the version
   * that was actually reviewed, and that version is cloned into a fresh
   * editable copy so the member reopens a pre-filled form while the reviewed
   * version stays frozen and readable.
   */
  async requestChanges(reportId: string, reviewerId: string, comment: string) {
    const report = await this.loadReport(reportId);
    const status = nextStatus(report.status, 'REQUEST_CHANGES');
    const reviewedVersionId = report.currentVersionId!;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.reviewAction.create({
        data: {
          reportId,
          versionId: reviewedVersionId,
          reviewerId,
          action: 'REQUEST_CHANGES',
          comment,
        },
      });

      const newVersion = await this.versions.cloneVersion(tx, reviewedVersionId);

      return tx.report.update({
        where: { id: reportId },
        data: { status, currentVersionId: newVersion.id },
      });
    });

    this.events.emit('report.reviewed', {
      reportId,
      action: 'REQUEST_CHANGES',
      reviewerId,
    });
    return { id: updated.id, status: updated.status };
  }

  /** Full comment history, newest first, each tagged with the version it hit. */
  async history(reportId: string) {
    const actions = await this.prisma.reviewAction.findMany({
      where: { reportId },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: { select: { name: true } },
        version: { select: { versionNumber: true } },
      },
    });

    return actions.map((action) => ({
      id: action.id,
      action: action.action,
      comment: action.comment,
      reviewerName: action.reviewer.name,
      versionNumber: action.version.versionNumber,
      createdAt: action.createdAt.toISOString(),
    }));
  }

  private async loadReport(reportId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, currentVersionId: true },
    });
    if (!report || !report.currentVersionId) {
      throw new NotFoundException('Report not found');
    }
    return report;
  }
}
