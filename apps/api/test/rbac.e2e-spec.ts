import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PASSWORD = 'Demo@1234';

/**
 * The access-control rules the whole design rests on, exercised against a real
 * app: userId always comes from the JWT, content routes and review routes are
 * separate families, and a member can never learn that another member's report
 * exists.
 */
describe('RBAC (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let http: App;

  let memberAToken: string;
  let memberBToken: string;
  let managerToken: string;

  let memberAReportId: string;
  let memberADraftId: string;

  const userIds: string[] = [];
  const projectIds: string[] = [];

  async function makeUser(role: 'MEMBER' | 'MANAGER' | 'ADMIN') {
    const email = `e2e-rbac-${role.toLowerCase()}+${randomUUID()}@example.com`;
    const user = await prisma.user.create({
      data: {
        email,
        name: `E2E ${role}`,
        role,
        passwordHash: await hash(PASSWORD, 12),
      },
    });
    userIds.push(user.id);

    const login = await request(http)
      .post('/auth/login')
      .send({ email, password: PASSWORD });
    return { id: user.id, token: login.body.accessToken as string };
  }

  const validContent = {
    tasks: [
      {
        name: 'Rewritten by the wrong person',
        priority: 'HIGH',
        status: 'COMPLETED',
        plannedPct: 100,
        actualPct: 100,
        hoursPlanned: 8,
        hoursSpent: 8,
      },
    ],
    blockers: [],
    achievements: [],
    hours: [],
  };

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

    const memberA = await makeUser('MEMBER');
    const memberB = await makeUser('MEMBER');
    const manager = await makeUser('MANAGER');
    memberAToken = memberA.token;
    memberBToken = memberB.token;
    managerToken = manager.token;

    const project = await prisma.project.create({
      data: {
        name: `E2E RBAC ${randomUUID()}`,
        code: `E2E${Math.floor(Math.random() * 900 + 100)}`,
      },
    });
    projectIds.push(project.id);

    // A submitted report belonging to member A, and a draft that must stay private.
    const submitted = await request(http)
      .post('/reports')
      .set('Authorization', `Bearer ${memberAToken}`)
      .send({ projectId: project.id, weekStart: '2026-03-02' });
    memberAReportId = submitted.body.id;

    await request(http)
      .patch(`/reports/${memberAReportId}/content`)
      .set('Authorization', `Bearer ${memberAToken}`)
      .send(validContent);
    await request(http)
      .post(`/reports/${memberAReportId}/submit`)
      .set('Authorization', `Bearer ${memberAToken}`);

    const draft = await request(http)
      .post('/reports')
      .set('Authorization', `Bearer ${memberAToken}`)
      .send({ projectId: project.id, weekStart: '2026-03-09' });
    memberADraftId = draft.body.id;
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
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await app.close();
  });

  it("member cannot read another member's report — 404, not 403, so ids cannot be probed", () =>
    request(http)
      .get(`/reports/${memberAReportId}`)
      .set('Authorization', `Bearer ${memberBToken}`)
      .expect(404));

  it("member cannot write to another member's report", () =>
    request(http)
      .patch(`/reports/${memberADraftId}/content`)
      .set('Authorization', `Bearer ${memberBToken}`)
      .send(validContent)
      .expect(404));

  it('member cannot approve a report', () =>
    request(http)
      .post(`/reviews/${memberAReportId}/approve`)
      .set('Authorization', `Bearer ${memberAToken}`)
      .send({})
      .expect(403));

  it('member cannot reach the manager report list', () =>
    request(http)
      .get('/team/reports')
      .set('Authorization', `Bearer ${memberAToken}`)
      .expect(403));

  it('manager cannot edit report content — the route family is member-only', () =>
    request(http)
      .patch(`/reports/${memberAReportId}/content`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send(validContent)
      .expect(403));

  it('manager cannot submit on a member\'s behalf', () =>
    request(http)
      .post(`/reports/${memberAReportId}/submit`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(403));

  it('unauthenticated requests are rejected', async () => {
    await request(http).get('/team/reports').expect(401);
    await request(http).get('/reports').expect(401);
    await request(http).get('/analytics/summary').expect(401);
  });

  it('registration cannot self-assign ADMIN', async () => {
    const email = `e2e-escalate+${randomUUID()}@example.com`;
    await request(http)
      .post('/auth/register')
      .send({ email, password: PASSWORD, name: 'Escalation', role: 'ADMIN' })
      .expect(400);

    const created = await prisma.user.findUnique({ where: { email } });
    expect(created).toBeNull();
  });

  it('drafts never appear on the team dashboard', async () => {
    const res = await request(http)
      .get('/team/reports')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(
      res.body.data.every(
        (report: { status: string }) => report.status !== 'DRAFT',
      ),
    ).toBe(true);
    expect(
      res.body.data.some(
        (report: { id: string }) => report.id === memberADraftId,
      ),
    ).toBe(false);
  });

  it('a DRAFT status filter cannot be used to surface drafts', async () => {
    const res = await request(http)
      .get('/team/reports?status=DRAFT')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(
      res.body.data.every(
        (report: { status: string }) => report.status !== 'DRAFT',
      ),
    ).toBe(true);
  });

  it('only an admin manages roles', () =>
    request(http)
      .patch(`/users/${userIds[0]}/role`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ role: 'ADMIN' })
      .expect(403));
});
