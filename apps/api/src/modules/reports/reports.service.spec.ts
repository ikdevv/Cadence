import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportVersionsService } from './report-versions.service.js';
import { ReportsService } from './reports.service.js';

const OWNER = 'user-1';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: {
    report: Record<string, ReturnType<typeof vi.fn>>;
    reportVersion: Record<string, ReturnType<typeof vi.fn>>;
    reviewAction: Record<string, ReturnType<typeof vi.fn>>;
    $transaction: ReturnType<typeof vi.fn>;
  };
  let versions: {
    getEditableVersion: ReturnType<typeof vi.fn>;
    listVersions: ReturnType<typeof vi.fn>;
    serialize: ReturnType<typeof vi.fn>;
    findVersionByNumber: ReturnType<typeof vi.fn>;
  };
  let events: { emit: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      report: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      reportVersion: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
      reviewAction: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: unknown) => unknown)(prisma)
          : arg,
      ),
    };
    versions = {
      getEditableVersion: vi.fn(),
      listVersions: vi.fn().mockResolvedValue([]),
      serialize: vi.fn(),
      findVersionByNumber: vi.fn(),
    };
    events = { emit: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ReportVersionsService, useValue: versions },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = module.get(ReportsService);
  });

  describe('assertOwnedReport', () => {
    it('filters by userId in the query rather than comparing afterwards', async () => {
      prisma.report.findFirst!.mockResolvedValue({ id: 'rep-1', status: 'DRAFT' });

      await service.assertOwnedReport('rep-1', OWNER);

      expect(prisma.report.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { publicId: 'rep-1', userId: OWNER } }),
      );
    });

    it("404s on another member's report so ids cannot be probed", async () => {
      prisma.report.findFirst!.mockResolvedValue(null);

      await expect(
        service.assertOwnedReport('rep-1', 'someone-else'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('normalizes the week to its Monday before writing', async () => {
      prisma.report.create!.mockResolvedValue({ id: 'rep-1' });
      prisma.reportVersion.create!.mockResolvedValue({ id: 'ver-1' });
      prisma.report.update!.mockResolvedValue({ id: 'rep-1' });

      // A Sunday — the day most likely to land on the wrong week.
      await service.create(OWNER, {
        projectId: 'proj-1',
        weekStart: '2026-08-09T12:00:00.000Z',
      });

      const { data } = prisma.report.create!.mock.calls[0]![0];
      expect(data.weekStart.toISOString()).toBe('2026-08-03T00:00:00.000Z');
      expect(data.status).toBe('DRAFT');
    });

    it('creates version 1 unsubmitted and points the report at it', async () => {
      prisma.report.create!.mockResolvedValue({ id: 'rep-1' });
      prisma.reportVersion.create!.mockResolvedValue({ id: 'ver-1' });
      prisma.report.update!.mockResolvedValue({ id: 'rep-1' });

      await service.create(OWNER, {
        projectId: 'proj-1',
        weekStart: '2026-08-03',
      });

      expect(prisma.reportVersion.create).toHaveBeenCalledWith({
        data: { reportId: 'rep-1', versionNumber: 1, submittedAt: null },
      });
      expect(prisma.report.update!.mock.calls[0]![0].data).toEqual({
        currentVersionId: 'ver-1',
      });
    });
  });

  describe('submit', () => {
    const version = { id: 'ver-1' };

    beforeEach(() => {
      versions.getEditableVersion.mockResolvedValue(version);
      prisma.reportVersion.findUnique!.mockResolvedValue({
        id: 'ver-1',
        tasks: [{ id: 't1' }],
        blockers: [],
        achievements: [],
      });
      prisma.report.findUnique!.mockResolvedValue({
        id: 'rep-1',
        weekStart: new Date('2026-08-03'),
        status: 'SUBMITTED',
        project: {},
        user: {},
        currentVersion: null,
        _count: { versions: 1 },
      });
    });

    it('freezes the editable version instead of creating a new one', async () => {
      prisma.report.findFirst!.mockResolvedValue({ id: 'rep-1', status: 'DRAFT' });

      await service.submit('rep-1', OWNER);

      expect(prisma.reportVersion.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ver-1' } }),
      );
      expect(prisma.reportVersion.create).not.toHaveBeenCalled();
      expect(events.emit).toHaveBeenCalledWith('report.submitted', {
        reportId: 'rep-1',
        userId: OWNER,
        versionId: 'ver-1',
      });
    });

    it('accepts a resubmission of a report sent back for correction', async () => {
      prisma.report.findFirst!.mockResolvedValue({
        id: 'rep-1',
        status: 'NEEDS_CORRECTION',
      });

      await expect(service.submit('rep-1', OWNER)).resolves.toBeDefined();
    });

    it.each(['SUBMITTED', 'APPROVED'])(
      'refuses to submit a report already in %s',
      async (status) => {
        prisma.report.findFirst!.mockResolvedValue({ id: 'rep-1', status });

        await expect(service.submit('rep-1', OWNER)).rejects.toBeInstanceOf(
          ConflictException,
        );
      },
    );

    it('requires at least one task', async () => {
      prisma.report.findFirst!.mockResolvedValue({ id: 'rep-1', status: 'DRAFT' });
      prisma.reportVersion.findUnique!.mockResolvedValue({
        id: 'ver-1',
        tasks: [],
        blockers: [],
        achievements: [],
      });

      await expect(service.submit('rep-1', OWNER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('allows only one key blocker', async () => {
      prisma.report.findFirst!.mockResolvedValue({ id: 'rep-1', status: 'DRAFT' });
      prisma.reportVersion.findUnique!.mockResolvedValue({
        id: 'ver-1',
        tasks: [{ id: 't1' }],
        blockers: [{ isKeyIssue: true }, { isKeyIssue: true }],
        achievements: [],
      });

      await expect(service.submit('rep-1', OWNER)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('deletes a draft', async () => {
      prisma.report.findFirst!.mockResolvedValue({ id: 'rep-1', status: 'DRAFT' });

      await expect(service.remove('rep-1', OWNER)).resolves.toEqual({
        id: 'rep-1',
      });
      expect(prisma.report.delete).toHaveBeenCalled();
    });

    it.each(['SUBMITTED', 'NEEDS_CORRECTION', 'APPROVED'])(
      'refuses to delete a report in %s',
      async (status) => {
        prisma.report.findFirst!.mockResolvedValue({ id: 'rep-1', status });

        await expect(service.remove('rep-1', OWNER)).rejects.toBeInstanceOf(
          ConflictException,
        );
        expect(prisma.report.delete).not.toHaveBeenCalled();
      },
    );
  });
});
