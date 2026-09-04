import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ReportVersionsService } from './report-versions.service.js';

function makeSourceVersion() {
  return {
    id: 'ver-1',
    reportId: 'rep-1',
    versionNumber: 1,
    submittedAt: new Date('2026-08-07T09:00:00Z'),
    notes: 'week notes',
    links: 'https://example.com',
    nextWeekPlan: 'finish the migration',
    tasks: [
      {
        id: 'task-1',
        versionId: 'ver-1',
        name: 'Ship login',
        priority: 'HIGH',
        status: 'COMPLETED',
        plannedPct: 100,
        actualPct: 100,
        hoursPlanned: 8,
        hoursSpent: 9,
        deliverable: 'PR #12',
        sortOrder: 0,
      },
    ],
    blockers: [
      {
        id: 'blk-1',
        versionId: 'ver-1',
        description: 'Waiting on staging credentials',
        isKeyIssue: true,
        sortOrder: 0,
      },
    ],
    achievements: [
      {
        id: 'ach-1',
        versionId: 'ver-1',
        description: 'Cut build time in half',
        isKeyHighlight: true,
        sortOrder: 0,
      },
    ],
    hours: [{ id: 'hrs-1', versionId: 'ver-1', taskType: 'DEVELOPMENT', hours: 20 }],
  };
}

describe('ReportVersionsService', () => {
  let service: ReportVersionsService;
  let prisma: { reportVersion: Record<string, ReturnType<typeof vi.fn>> };

  beforeEach(async () => {
    prisma = {
      reportVersion: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportVersionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ReportVersionsService);
  });

  describe('getEditableVersion', () => {
    it('returns the version that has not been submitted', async () => {
      const draft = { id: 'ver-2', submittedAt: null };
      prisma.reportVersion.findFirst!.mockResolvedValue(draft);

      await expect(service.getEditableVersion('rep-1')).resolves.toBe(draft);
      expect(prisma.reportVersion.findFirst).toHaveBeenCalledWith({
        where: { reportId: 'rep-1', submittedAt: null },
      });
    });

    it('throws when every version is frozen, which is what locks a submitted report', async () => {
      prisma.reportVersion.findFirst!.mockResolvedValue(null);

      await expect(service.getEditableVersion('rep-1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('cloneVersion', () => {
    it('copies all four child collections into a fresh editable version', async () => {
      const create = vi.fn().mockResolvedValue({ id: 'ver-2' });
      const tx = {
        reportVersion: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(makeSourceVersion()),
          create,
        },
      };

      await service.cloneVersion(tx as never, 'ver-1');

      const { data } = create.mock.calls[0]![0];
      expect(data.versionNumber).toBe(2);
      expect(data.submittedAt).toBeNull();
      expect(data.notes).toBe('week notes');
      expect(data.tasks.create).toHaveLength(1);
      expect(data.blockers.create).toHaveLength(1);
      expect(data.achievements.create).toHaveLength(1);
      expect(data.hours.create).toHaveLength(1);
    });

    it('strips the source ids so the copies are new rows', async () => {
      const create = vi.fn().mockResolvedValue({ id: 'ver-2' });
      const tx = {
        reportVersion: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(makeSourceVersion()),
          create,
        },
      };

      await service.cloneVersion(tx as never, 'ver-1');

      const { data } = create.mock.calls[0]![0];
      for (const collection of [
        data.tasks.create,
        data.blockers.create,
        data.achievements.create,
        data.hours.create,
      ]) {
        for (const row of collection) {
          expect(row).not.toHaveProperty('id');
          expect(row).not.toHaveProperty('versionId');
        }
      }
      // Content itself survives the copy — the member reopens a pre-filled form.
      expect(data.tasks.create[0].name).toBe('Ship login');
      expect(data.blockers.create[0].isKeyIssue).toBe(true);
    });
  });
});
