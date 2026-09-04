import { ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportVersionsService } from '../reports/report-versions.service.js';
import { ReviewsService } from './reviews.service.js';

const REVIEWER = 'manager-1';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let tx: {
    reviewAction: { create: ReturnType<typeof vi.fn> };
    report: { update: ReturnType<typeof vi.fn> };
  };
  let prisma: {
    report: { findUnique: ReturnType<typeof vi.fn> };
    reviewAction: { findMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let versions: { cloneVersion: ReturnType<typeof vi.fn> };
  let events: { emit: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    tx = {
      reviewAction: { create: vi.fn() },
      report: {
        update: vi
          .fn()
          .mockImplementation(async ({ data }: { data: { status: string } }) => ({
            id: 'rep-1',
            status: data.status,
          })),
      },
    };
    prisma = {
      report: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'rep-1',
          status: 'SUBMITTED',
          currentVersionId: 'ver-1',
        }),
      },
      reviewAction: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (cb: (client: unknown) => unknown) => cb(tx)),
    };
    versions = {
      cloneVersion: vi.fn().mockResolvedValue({ id: 'ver-2' }),
    };
    events = { emit: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ReportVersionsService, useValue: versions },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = module.get(ReviewsService);
  });

  describe('approve', () => {
    it('records the action against the reviewed version and freezes nothing new', async () => {
      const result = await service.approve('rep-1', REVIEWER, 'Looks good');

      expect(result.status).toBe('APPROVED');
      expect(tx.reviewAction.create).toHaveBeenCalledWith({
        data: {
          reportId: 'rep-1',
          versionId: 'ver-1',
          reviewerId: REVIEWER,
          action: 'APPROVE',
          comment: 'Looks good',
        },
      });
      expect(versions.cloneVersion).not.toHaveBeenCalled();
    });

    it('409s when the report was already approved', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 'rep-1',
        status: 'APPROVED',
        currentVersionId: 'ver-1',
      });

      await expect(service.approve('rep-1', REVIEWER)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('404s on an unknown report', async () => {
      prisma.report.findUnique.mockResolvedValue(null);

      await expect(service.approve('nope', REVIEWER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('requestChanges', () => {
    it('attaches the comment to the reviewed version, then clones it', async () => {
      const result = await service.requestChanges(
        'rep-1',
        REVIEWER,
        'Task percentages do not line up with the hours logged.',
      );

      expect(result.status).toBe('NEEDS_CORRECTION');
      // The comment points at v(n) — the version actually reviewed.
      expect(tx.reviewAction.create.mock.calls[0]![0].data.versionId).toBe(
        'ver-1',
      );
      expect(versions.cloneVersion).toHaveBeenCalledWith(tx, 'ver-1');
      // ...and the report now points at the fresh editable copy.
      expect(tx.report.update.mock.calls[0]![0].data).toEqual({
        status: 'NEEDS_CORRECTION',
        currentVersionId: 'ver-2',
      });
    });

    it('runs the comment and the clone inside one transaction', async () => {
      await service.requestChanges('rep-1', REVIEWER, 'Please expand.');

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('409s on a draft, which never reached the dashboard', async () => {
      prisma.report.findUnique.mockResolvedValue({
        id: 'rep-1',
        status: 'DRAFT',
        currentVersionId: 'ver-1',
      });

      await expect(
        service.requestChanges('rep-1', REVIEWER, 'Please expand.'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(versions.cloneVersion).not.toHaveBeenCalled();
    });
  });
});
