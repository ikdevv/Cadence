/**
 * Deliberately shaped demo data — not randomly generated.
 *
 * Every state the UI can render has to exist here or a correct dashboard looks
 * broken: approved reports, a correction cycle that ended in approval, reports
 * still awaiting correction with real comments, reports awaiting review, private
 * drafts, and members with no report at all for the current week (which is what
 * makes the derived "not yet started" state visible).
 *
 * Run with: pnpm --filter cadence-api db:seed  (or prisma migrate reset --force)
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { Pool } from 'pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import type {
  TaskPriority,
  TaskStatus,
  TaskType,
} from '../src/generated/prisma/enums.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEMO_PASSWORD = 'Demo@1234';

function toWeekStart(date: Date): Date {
  const dt = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = dt.getUTCDay();
  dt.setUTCDate(dt.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return dt;
}

function weeksAgo(count: number): Date {
  const start = toWeekStart(new Date());
  start.setUTCDate(start.getUTCDate() - count * 7);
  return start;
}

/** A submission timestamp inside the given week, so history looks natural. */
function submittedIn(week: Date, dayOffset = 4, hour = 16): Date {
  const at = new Date(week);
  at.setUTCDate(at.getUTCDate() + dayOffset);
  at.setUTCHours(hour, 12, 0, 0);
  return at;
}

interface TaskSeed {
  name: string;
  priority: TaskPriority;
  status: TaskStatus;
  plannedPct: number;
  actualPct: number;
  hoursPlanned: number;
  hoursSpent: number;
  deliverable?: string;
}

interface VersionSeed {
  tasks: TaskSeed[];
  blockers: { description: string; isKeyIssue?: boolean }[];
  achievements: { description: string; isKeyHighlight?: boolean }[];
  hours: { taskType: TaskType; hours: number }[];
  notes?: string;
  links?: string;
  nextWeekPlan?: string;
}

/** A thin first draft: two tasks and a vague blocker. */
function thinVersion(theme: string): VersionSeed {
  return {
    tasks: [
      {
        name: `${theme} — initial pass`,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        plannedPct: 100,
        actualPct: 60,
        hoursPlanned: 14,
        hoursSpent: 11,
        deliverable: 'Branch pushed for review',
      },
      {
        name: 'Sprint ceremonies and planning',
        priority: 'LOW',
        status: 'COMPLETED',
        plannedPct: 100,
        actualPct: 100,
        hoursPlanned: 4,
        hoursSpent: 5,
      },
    ],
    blockers: [{ description: 'Some things are slower than expected.', isKeyIssue: true }],
    achievements: [{ description: 'Made progress on the main task.', isKeyHighlight: true }],
    hours: [
      { taskType: 'DEVELOPMENT', hours: 11 },
      { taskType: 'MEETINGS', hours: 5 },
    ],
    notes: 'Will pick the rest up next week.',
    nextWeekPlan: 'Finish the remaining work.',
  };
}

/** The corrected resubmission: four tasks and a specific, actionable blocker. */
function detailedVersion(theme: string): VersionSeed {
  return {
    tasks: [
      {
        name: `${theme} — initial pass`,
        priority: 'HIGH',
        status: 'COMPLETED',
        plannedPct: 100,
        actualPct: 100,
        hoursPlanned: 14,
        hoursSpent: 13.5,
        deliverable: 'PR #418, merged Thursday',
      },
      {
        name: `${theme} — regression tests`,
        priority: 'MEDIUM',
        status: 'COMPLETED',
        plannedPct: 100,
        actualPct: 100,
        hoursPlanned: 6,
        hoursSpent: 7,
        deliverable: '18 new cases, suite green',
      },
      {
        name: 'Staging deployment and smoke check',
        priority: 'HIGH',
        status: 'BLOCKED',
        plannedPct: 100,
        actualPct: 40,
        hoursPlanned: 5,
        hoursSpent: 2,
        deliverable: 'Blocked on credentials',
      },
      {
        name: 'Sprint ceremonies and planning',
        priority: 'LOW',
        status: 'COMPLETED',
        plannedPct: 100,
        actualPct: 100,
        hoursPlanned: 4,
        hoursSpent: 5,
      },
    ],
    blockers: [
      {
        description:
          'Staging deploy is blocked: the service account lost write access to the artifact bucket on Tuesday. Raised with infra as OPS-2214, no ETA yet.',
        isKeyIssue: true,
      },
      {
        description:
          'Design sign-off on the empty state is still pending, so that screen is behind a flag.',
      },
    ],
    achievements: [
      {
        description:
          `${theme} shipped a week early and cut the median request time from 840ms to 310ms.`,
        isKeyHighlight: true,
      },
      { description: 'Wrote the runbook the on-call rotation was missing.' },
    ],
    hours: [
      { taskType: 'DEVELOPMENT', hours: 20.5 },
      { taskType: 'TESTING', hours: 7 },
      { taskType: 'MEETINGS', hours: 5 },
      { taskType: 'DOCUMENTATION', hours: 2 },
    ],
    notes:
      'Percentages below are against the sprint commitment, and the hours line up with the tracker.',
    links: 'https://github.com/example/cadence/pull/418',
    nextWeekPlan:
      'Unblock the staging deploy, then start the reporting export work.',
  };
}

/** A solid, ordinary week — the baseline the dashboard is mostly made of. */
function standardVersion(theme: string, seed: number): VersionSeed {
  const dev = 16 + (seed % 5) * 2;
  const testing = 3 + (seed % 3);
  const meetings = 3 + (seed % 4);
  const docs = 1 + (seed % 2);

  return {
    tasks: [
      {
        name: `${theme} — implementation`,
        priority: 'HIGH',
        status: 'COMPLETED',
        plannedPct: 100,
        actualPct: 100,
        hoursPlanned: dev - 4,
        hoursSpent: dev - 3,
        deliverable: `PR #${300 + seed}`,
      },
      {
        name: `${theme} — review feedback`,
        priority: 'MEDIUM',
        status: seed % 3 === 0 ? 'IN_PROGRESS' : 'COMPLETED',
        plannedPct: 100,
        actualPct: seed % 3 === 0 ? 70 : 100,
        hoursPlanned: 5,
        hoursSpent: 4 + (seed % 3),
        deliverable: 'Comments addressed',
      },
      {
        name: 'Support rotation',
        priority: 'LOW',
        status: 'COMPLETED',
        plannedPct: 100,
        actualPct: 100,
        hoursPlanned: 4,
        hoursSpent: testing,
      },
    ],
    blockers:
      seed % 2 === 0
        ? [
            {
              description:
                'Waiting on the vendor sandbox to be re-provisioned before the integration can be tested end to end.',
              isKeyIssue: true,
            },
          ]
        : [],
    achievements: [
      {
        description: `${theme} went out without a rollback, and the error rate stayed flat.`,
        isKeyHighlight: true,
      },
    ],
    hours: [
      { taskType: 'DEVELOPMENT', hours: dev },
      { taskType: 'TESTING', hours: testing },
      { taskType: 'MEETINGS', hours: meetings },
      { taskType: 'DOCUMENTATION', hours: docs },
    ],
    notes: 'Nothing unusual this week.',
    nextWeekPlan: `Start on the follow-up work for ${theme.toLowerCase()}.`,
  };
}

async function createVersion(
  reportId: string,
  versionNumber: number,
  content: VersionSeed,
  submittedAt: Date | null,
) {
  return prisma.reportVersion.create({
    data: {
      reportId,
      versionNumber,
      submittedAt,
      notes: content.notes ?? null,
      links: content.links ?? null,
      nextWeekPlan: content.nextWeekPlan ?? null,
      tasks: {
        create: content.tasks.map((task, index) => ({
          ...task,
          sortOrder: index,
        })),
      },
      blockers: {
        create: content.blockers.map((blocker, index) => ({
          description: blocker.description,
          isKeyIssue: blocker.isKeyIssue ?? false,
          sortOrder: index,
        })),
      },
      achievements: {
        create: content.achievements.map((achievement, index) => ({
          description: achievement.description,
          isKeyHighlight: achievement.isKeyHighlight ?? false,
          sortOrder: index,
        })),
      },
      hours: { create: content.hours },
    },
  });
}

type Scenario =
  | 'APPROVED'
  | 'APPROVED_AFTER_CORRECTION'
  | 'NEEDS_CORRECTION'
  | 'NEEDS_CORRECTION_TWICE'
  | 'SUBMITTED'
  | 'DRAFT';

async function seedReport(options: {
  userId: string;
  projectId: string;
  managerId: string;
  week: Date;
  theme: string;
  scenario: Scenario;
  seed: number;
}) {
  const { userId, projectId, managerId, week, theme, scenario, seed } = options;

  const report = await prisma.report.create({
    data: { userId, projectId, weekStart: week, status: 'DRAFT' },
  });

  const link = (versionId: string, status: Scenario | 'DRAFT') =>
    prisma.report.update({
      where: { id: report.id },
      data: {
        currentVersionId: versionId,
        status:
          status === 'APPROVED' || status === 'APPROVED_AFTER_CORRECTION'
            ? 'APPROVED'
            : status === 'SUBMITTED'
              ? 'SUBMITTED'
              : status === 'DRAFT'
                ? 'DRAFT'
                : 'NEEDS_CORRECTION',
      },
    });

  const review = (
    versionId: string,
    action: 'APPROVE' | 'REQUEST_CHANGES',
    comment: string,
    at: Date,
  ) =>
    prisma.reviewAction.create({
      data: {
        reportId: report.id,
        versionId,
        reviewerId: managerId,
        action,
        comment,
        createdAt: at,
      },
    });

  if (scenario === 'DRAFT') {
    const version = await createVersion(report.id, 1, thinVersion(theme), null);
    await link(version.id, 'DRAFT');
    return;
  }

  if (scenario === 'SUBMITTED') {
    const version = await createVersion(
      report.id,
      1,
      standardVersion(theme, seed),
      submittedIn(week),
    );
    await link(version.id, 'SUBMITTED');
    return;
  }

  if (scenario === 'APPROVED') {
    const version = await createVersion(
      report.id,
      1,
      standardVersion(theme, seed),
      submittedIn(week),
    );
    await link(version.id, 'APPROVED');
    await review(
      version.id,
      'APPROVE',
      'Clear write-up, and the hours match the tracker. Thanks.',
      submittedIn(week, 5, 10),
    );
    return;
  }

  // Every remaining scenario went through at least one correction cycle:
  // v1 is frozen, the comment points at v1, and v2 starts as a copy of it.
  const v1 = await createVersion(report.id, 1, thinVersion(theme), submittedIn(week));
  await review(
    v1.id,
    'REQUEST_CHANGES',
    "Task percentages don't add up against the hours logged — please revise the row for this project and add detail on the deployment blocker. \"Some things are slower\" doesn't tell me what to escalate.",
    submittedIn(week, 4, 18),
  );

  if (scenario === 'NEEDS_CORRECTION_TWICE') {
    const v2 = await createVersion(
      report.id,
      2,
      standardVersion(theme, seed),
      submittedIn(week, 5, 11),
    );
    await review(
      v2.id,
      'REQUEST_CHANGES',
      'Better, but the blocker still has no owner or ticket number. Add those and resubmit — I need something to take to the infra sync.',
      submittedIn(week, 5, 15),
    );
    const v3 = await createVersion(report.id, 3, detailedVersion(theme), null);
    await link(v3.id, 'NEEDS_CORRECTION');
    return;
  }

  const v2 = await createVersion(
    report.id,
    2,
    detailedVersion(theme),
    scenario === 'APPROVED_AFTER_CORRECTION' ? submittedIn(week, 5, 9) : null,
  );

  if (scenario === 'APPROVED_AFTER_CORRECTION') {
    await link(v2.id, 'APPROVED');
    await review(
      v2.id,
      'APPROVE',
      'That is exactly the detail I needed on the blocker. Approved.',
      submittedIn(week, 5, 12),
    );
  } else {
    await link(v2.id, 'NEEDS_CORRECTION');
  }
}

async function main() {
  console.log('Clearing existing data...');
  // Children first; the rest cascade from Report and User.
  await prisma.reviewAction.deleteMany();
  await prisma.report.updateMany({ data: { currentVersionId: null } });
  await prisma.reportVersion.deleteMany();
  await prisma.report.deleteMany();
  await prisma.project.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hash(DEMO_PASSWORD, 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      name: 'Admin User',
      role: 'ADMIN',
      passwordHash,
    },
  });
  const manager = await prisma.user.create({
    data: {
      email: 'manager@demo.com',
      name: 'Nimal Perera',
      role: 'MANAGER',
      passwordHash,
    },
  });

  const memberSeeds = [
    { email: 'kasun@demo.com', name: 'Kasun Silva' },
    { email: 'dilani@demo.com', name: 'Dilani Fernando' },
    { email: 'ruwan@demo.com', name: 'Ruwan Jayasuriya' },
    { email: 'amaya@demo.com', name: 'Amaya Wickrama' },
    { email: 'tharindu@demo.com', name: 'Tharindu Bandara' },
  ];
  const members = [];
  for (const member of memberSeeds) {
    members.push(
      await prisma.user.create({
        data: { ...member, role: 'MEMBER', passwordHash },
      }),
    );
  }
  const [kasun, dilani, ruwan, amaya, tharindu] = members;

  const projectSeeds = [
    { name: 'Client A Platform', code: 'CLA', color: '#2563EB' },
    { name: 'Client B Portal', code: 'CLB', color: '#7C3AED' },
    { name: 'Internal Tooling', code: 'INT', color: '#059669' },
    { name: 'R&D', code: 'RND', color: '#D97706' },
    { name: 'Marketing Site', code: 'MKT', color: '#DB2777' },
  ];
  const projects = [];
  for (const project of projectSeeds) {
    projects.push(await prisma.project.create({ data: project }));
  }
  const [clientA, clientB, tooling, rnd, marketing] = projects;

  const themes = [
    'Billing export',
    'Onboarding flow',
    'Search relevance',
    'Audit log',
    'Notification service',
    'Design system rollout',
  ];

  /**
   * The grid, written out rather than generated, so every scenario the UI can
   * render is guaranteed present:
   *
   *   w5..w3  approved history, including three correction cycles that ended
   *           in approval (proves version history in a happy path)
   *   w2      one report still in correction after two comments
   *   w1      two reports awaiting correction, two awaiting review, one draft
   *   w0      one private draft, two awaiting review, and two members with no
   *           report at all — the "not yet started" cells
   */
  const grid: {
    user: (typeof members)[number];
    project: (typeof projects)[number];
    weeksBack: number;
    scenario: Scenario;
  }[] = [
    // week -5
    { user: kasun!, project: clientA!, weeksBack: 5, scenario: 'APPROVED' },
    { user: dilani!, project: clientB!, weeksBack: 5, scenario: 'APPROVED' },
    { user: ruwan!, project: tooling!, weeksBack: 5, scenario: 'APPROVED' },
    { user: amaya!, project: rnd!, weeksBack: 5, scenario: 'APPROVED' },
    { user: tharindu!, project: marketing!, weeksBack: 5, scenario: 'APPROVED' },
    // week -4
    {
      user: kasun!,
      project: clientA!,
      weeksBack: 4,
      scenario: 'APPROVED_AFTER_CORRECTION',
    },
    { user: dilani!, project: clientB!, weeksBack: 4, scenario: 'APPROVED' },
    { user: ruwan!, project: tooling!, weeksBack: 4, scenario: 'APPROVED' },
    { user: amaya!, project: clientA!, weeksBack: 4, scenario: 'APPROVED' },
    { user: tharindu!, project: marketing!, weeksBack: 4, scenario: 'APPROVED' },
    // week -3
    { user: kasun!, project: clientA!, weeksBack: 3, scenario: 'APPROVED' },
    {
      user: dilani!,
      project: clientB!,
      weeksBack: 3,
      scenario: 'APPROVED_AFTER_CORRECTION',
    },
    {
      user: ruwan!,
      project: tooling!,
      weeksBack: 3,
      scenario: 'APPROVED_AFTER_CORRECTION',
    },
    { user: amaya!, project: rnd!, weeksBack: 3, scenario: 'APPROVED' },
    { user: tharindu!, project: clientA!, weeksBack: 3, scenario: 'APPROVED' },
    // week -2
    { user: kasun!, project: clientA!, weeksBack: 2, scenario: 'APPROVED' },
    {
      user: dilani!,
      project: clientB!,
      weeksBack: 2,
      scenario: 'NEEDS_CORRECTION_TWICE',
    },
    { user: ruwan!, project: tooling!, weeksBack: 2, scenario: 'SUBMITTED' },
    { user: amaya!, project: rnd!, weeksBack: 2, scenario: 'APPROVED' },
    { user: tharindu!, project: marketing!, weeksBack: 2, scenario: 'APPROVED' },
    // week -1
    {
      user: kasun!,
      project: clientA!,
      weeksBack: 1,
      scenario: 'NEEDS_CORRECTION',
    },
    { user: dilani!, project: clientB!, weeksBack: 1, scenario: 'SUBMITTED' },
    { user: ruwan!, project: tooling!, weeksBack: 1, scenario: 'DRAFT' },
    {
      user: amaya!,
      project: rnd!,
      weeksBack: 1,
      scenario: 'NEEDS_CORRECTION',
    },
    { user: tharindu!, project: marketing!, weeksBack: 1, scenario: 'SUBMITTED' },
    // current week — ruwan and tharindu deliberately have nothing
    { user: kasun!, project: clientA!, weeksBack: 0, scenario: 'DRAFT' },
    { user: dilani!, project: clientB!, weeksBack: 0, scenario: 'SUBMITTED' },
    { user: amaya!, project: rnd!, weeksBack: 0, scenario: 'SUBMITTED' },
  ];

  console.log(`Seeding ${grid.length} reports...`);
  let seed = 1;
  for (const row of grid) {
    await seedReport({
      userId: row.user.id,
      projectId: row.project.id,
      managerId: manager.id,
      week: weeksAgo(row.weeksBack),
      theme: themes[seed % themes.length]!,
      scenario: row.scenario,
      seed: seed++,
    });
  }

  const counts = await prisma.report.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  console.log('\nSeed complete.');
  console.log(`  users:    ${members.length + 2} (${admin.email}, ${manager.email}, +5 members)`);
  console.log(`  projects: ${projects.length}`);
  for (const count of counts) {
    console.log(`  ${count.status.padEnd(17)} ${count._count._all}`);
  }
  console.log(`\n  password for every account: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
