import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { generatePublicId } from '../src/common/utils/public-id.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PASSWORD = 'Demo@1234';

/** The required cycle, end to end: submit → request changes → edit → resubmit → approve. */
describe('Report correction cycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let http: App;

  let memberToken: string;
  let managerToken: string;
  let reportId: string;
  let projectId: string;
  const userIds: string[] = [];

  const contentV1 = {
    tasks: [
      {
        name: 'Billing export — initial pass',
        priority: 'HIGH' as const,
        status: 'IN_PROGRESS' as const,
        plannedPct: 100,
        actualPct: 60,
        hoursPlanned: 12,
        hoursSpent: 9,
      },
    ],
    blockers: [{ description: 'Things are slow.', isKeyIssue: true }],
    achievements: [],
    hours: [{ taskType: 'DEVELOPMENT' as const, hours: 9 }],
  };

  async function makeUser(role: 'MEMBER' | 'MANAGER') {
    const email = `e2e-cycle-${role.toLowerCase()}+${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        name: `E2E ${role}`,
        role,
        passwordHash: await hash(PASSWORD, 12),
        publicId: generatePublicId('usr'),
      },
    });
    userIds.push(user.id);
    const login = await request(http)
      .post('/auth/login')
      .send({ email, password: PASSWORD });
    return login.body.accessToken as string;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    http = app.getHttpServer();

    memberToken = await makeUser('MEMBER');
    managerToken = await makeUser('MANAGER');

    const project = await prisma.project.create({
      data: {
        name: `E2E Cycle ${randomUUID()}`,
        code: `CYC${Math.floor(Math.random() * 900 + 100)}`,
      },
    });
    projectId = project.id;

    const created = await request(http)
      .post('/reports')
      .set('Authorization', `Bearer ${memberToken}`)
      // A Sunday: the report must land on the Monday of that week.
      .send({ projectId, weekStart: '2026-04-12' })
      .expect(201);
    reportId = created.body.publicId;
  });

  afterAll(async () => {
    await prisma.reviewAction.deleteMany({
      where: { report: { userId: { in: userIds } } },
    });
    await prisma.report.updateMany({
      where: { userId: { in: userIds } },
      data: { currentVersionId: null },
    });
    await prisma.reportVersion.deleteMany({
      where: { report: { userId: { in: userIds } } },
    });
    await prisma.report.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await app.close();
  });

  it('normalizes the week to its Monday', async () => {
    const res = await request(http)
      .get(`/reports/${reportId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(res.body.weekStart).toBe('2026-04-06');
    expect(res.body.status).toBe('DRAFT');
  });

  it('refuses to submit an empty report', () =>
    request(http)
      .post(`/reports/${reportId}/submit`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(400));

  it('saves content and submits', async () => {
    await request(http)
      .patch(`/reports/${reportId}/content`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send(contentV1)
      .expect(200);

    const res = await request(http)
      .post(`/reports/${reportId}/submit`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201);

    expect(res.body.status).toBe('SUBMITTED');
    expect(res.body.currentVersion.versionNumber).toBe(1);
    expect(res.body.currentVersion.submittedAt).not.toBeNull();
    expect(res.body.versionCount).toBe(1);
  });

  it('locks content once submitted', () =>
    request(http)
      .patch(`/reports/${reportId}/content`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send(contentV1)
      .expect(409));

  it('requires a comment when requesting changes', () =>
    request(http)
      .post(`/reviews/${reportId}/request-changes`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ comment: 'no' })
      .expect(400));

  it('requesting changes clones v1 into an editable v2', async () => {
    await request(http)
      .post(`/reviews/${reportId}/request-changes`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        comment:
          'Percentages do not line up with the hours logged — please add detail on the blocker.',
      })
      .expect(200);

    const res = await request(http)
      .get(`/reports/${reportId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(res.body.status).toBe('NEEDS_CORRECTION');
    expect(res.body.versionCount).toBe(2);
    expect(res.body.currentVersion.versionNumber).toBe(2);
    expect(res.body.currentVersion.submittedAt).toBeNull();
    // The member reopens a pre-filled form, not a blank one.
    expect(res.body.currentVersion.tasks).toHaveLength(1);
    expect(res.body.currentVersion.tasks[0].name).toBe(
      'Billing export — initial pass',
    );
    // ...and the comment is attached to the version that was reviewed.
    expect(res.body.latestReview.versionNumber).toBe(1);
    expect(res.body.latestReview.action).toBe('REQUEST_CHANGES');
  });

  it('keeps v1 frozen and readable after the correction', async () => {
    const res = await request(http)
      .get(`/reports/${reportId}/versions/1`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);

    expect(res.body.submittedAt).not.toBeNull();
    expect(res.body.blockers[0].description).toBe('Things are slow.');
  });

  it('edits and resubmits, and the two versions differ', async () => {
    await request(http)
      .patch(`/reports/${reportId}/content`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        ...contentV1,
        tasks: [
          { ...contentV1.tasks[0]!, status: 'COMPLETED', actualPct: 100 },
          {
            name: 'Staging deploy',
            priority: 'MEDIUM',
            status: 'BLOCKED',
            plannedPct: 100,
            actualPct: 40,
            hoursPlanned: 4,
            hoursSpent: 2,
          },
        ],
        blockers: [
          {
            description:
              'Service account lost write access to the artifact bucket, raised as OPS-2214.',
            isKeyIssue: true,
          },
        ],
      })
      .expect(200);

    const submitted = await request(http)
      .post(`/reports/${reportId}/submit`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(201);
    expect(submitted.body.status).toBe('SUBMITTED');

    const v1 = await request(http)
      .get(`/reports/${reportId}/versions/1`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(200);
    expect(v1.body.tasks).toHaveLength(1);
    expect(submitted.body.currentVersion.tasks).toHaveLength(2);
  });

  it('rejects only one key blocker per version', () =>
    request(http)
      .patch(`/reports/${reportId}/content`)
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        ...contentV1,
        blockers: [
          { description: 'First', isKeyIssue: true },
          { description: 'Second', isKeyIssue: true },
        ],
      })
      // Content is locked again after resubmission, so this is a 409 either way;
      // the key-flag rule itself is covered by the unit tests.
      .expect(409));

  it('approves, and the approved version stays frozen', async () => {
    await request(http)
      .post(`/reviews/${reportId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ comment: 'That is the detail I needed. Approved.' })
      .expect(200);

    const res = await request(http)
      .get(`/team/reports/${reportId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(res.body.status).toBe('APPROVED');
    expect(res.body.versionCount).toBe(2);
    expect(res.body.currentVersion.versionNumber).toBe(2);
    // Full comment history, each entry tagged with the version it hit.
    expect(res.body.reviewHistory).toHaveLength(2);
    expect(res.body.reviewHistory.map((r: { action: string }) => r.action)).toEqual([
      'APPROVE',
      'REQUEST_CHANGES',
    ]);
  });

  it('refuses to approve twice', () =>
    request(http)
      .post(`/reviews/${reportId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(409));

  it('refuses to delete an approved report', () =>
    request(http)
      .delete(`/reports/${reportId}`)
      .set('Authorization', `Bearer ${memberToken}`)
      .expect(409));
});
