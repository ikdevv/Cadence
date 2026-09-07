import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { paginate } from '../../common/dto/pagination.dto.js';
import { decimalToNumber } from '../../common/utils/decimal.js';
import { generatePublicId } from '../../common/utils/public-id.js';
import { isWeekOver } from '../../common/utils/week.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { Role } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateUserDto, ListUsersDto } from './dto/user.dto.js';

const PASSWORD_SALT_ROUNDS = 12;

/** passwordHash never leaves this service — every read goes through the allowlist. */
const userSelect = {
  id: true,
  publicId: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role?: Role;
  }) {
    return this.prisma.user.create({
      data: { ...data, publicId: generatePublicId('usr') },
    });
  }

  listActiveMembers() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: userSelect,
    });
  }

  async list(query: ListUsersDto) {
    const { page, pageSize, skip, take } = paginate(query);
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        select: { ...userSelect, _count: { select: { reports: true } } },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: rows.map(({ _count, ...user }) => ({
        ...user,
        reportCount: _count.reports,
      })),
      page,
      pageSize,
      total,
    };
  }

  async createByAdmin(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException('Email already in use');
    }
    const passwordHash = await hash(dto.password, PASSWORD_SALT_ROUNDS);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash,
        publicId: generatePublicId('usr'),
      },
      select: userSelect,
    });
  }

  /** An admin cannot demote themselves — that is how everyone gets locked out. */
  async updateRole(id: string, role: Role, actorId: string) {
    if (id === actorId) {
      throw new BadRequestException('You cannot change your own role');
    }
    await this.assertExists(id);
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: userSelect,
    });
  }

  /**
   * Deactivation revokes every refresh token in the same transaction, so an
   * active session dies at the next refresh instead of lingering. Reports are
   * kept: a deactivated user drops out of compliance denominators but their
   * history stays on the dashboard.
   */
  async updateStatus(id: string, isActive: boolean, actorId: string) {
    if (id === actorId && !isActive) {
      throw new BadRequestException('You cannot deactivate your own account');
    }
    await this.assertExists(id);

    return this.prisma.$transaction(async (tx) => {
      if (!isActive) {
        await tx.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      return tx.user.update({
        where: { id },
        data: { isActive },
        select: userSelect,
      });
    });
  }

  /** Manager-facing profile: who they are, how they are doing, recent reports. */
  async profile(publicId: string) {
    const user = await this.prisma.user.findUnique({
      where: { publicId },
      select: userSelect,
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const reports = await this.prisma.report.findMany({
      where: { userId: user.id },
      orderBy: { weekStart: 'desc' },
      include: {
        project: { select: { id: true, name: true, code: true, color: true } },
        currentVersion: { include: { tasks: true } },
        _count: { select: { versions: true } },
      },
    });

    const corrected = await this.prisma.reviewAction.findMany({
      where: { action: 'REQUEST_CHANGES', report: { userId: user.id } },
      select: { reportId: true },
      distinct: ['reportId'],
    });

    const countOf = (status: string) =>
      reports.filter((report) => report.status === status).length;

    const submittedReports = reports.filter(
      (report) => report.status !== 'DRAFT',
    );
    const onTime = submittedReports.filter((report) => {
      const submittedAt = report.currentVersion?.submittedAt;
      return submittedAt ? !isWeekOver(report.weekStart, submittedAt) : false;
    }).length;

    const totalHours = reports.reduce(
      (sum, report) =>
        sum +
        (report.currentVersion?.tasks ?? []).reduce(
          (taskSum, task) => taskSum + decimalToNumber(task.hoursSpent),
          0,
        ),
      0,
    );

    const projectCounts = new Map<string, number>();
    for (const report of reports) {
      projectCounts.set(
        report.project.name,
        (projectCounts.get(report.project.name) ?? 0) + 1,
      );
    }

    return {
      user,
      stats: {
        totalReports: reports.length,
        approved: countOf('APPROVED'),
        needsCorrection: countOf('NEEDS_CORRECTION'),
        submitted: countOf('SUBMITTED'),
        draft: countOf('DRAFT'),
        avgHoursPerWeek: reports.length
          ? Number((totalHours / reports.length).toFixed(1))
          : 0,
        onTimeSubmissionRate: submittedReports.length
          ? onTime / submittedReports.length
          : 0,
        correctionRate: reports.length ? corrected.length / reports.length : 0,
        topProjects: [...projectCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, reportCount]) => ({ name, reportCount })),
      },
      recentReports: submittedReports.slice(0, 10).map((report) => ({
        id: report.id,
        publicId: report.publicId,
        weekStart: report.weekStart.toISOString().slice(0, 10),
        status: report.status,
        project: report.project,
        taskCount: report.currentVersion?.tasks.length ?? 0,
        versionCount: report._count.versions,
      })),
    };
  }

  private async assertExists(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
