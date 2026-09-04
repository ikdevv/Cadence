import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreateProjectDto } from './dto/create-project.dto.js';
import type { UpdateProjectDto } from './dto/update-project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(includeInactive = false) {
    const projects = await this.prisma.project.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { reports: true } } },
    });

    return projects.map(({ _count, ...project }) => ({
      ...project,
      reportCount: _count.reports,
    }));
  }

  async create(dto: CreateProjectDto) {
    return this.prisma.project.create({ data: { ...dto } });
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.assertExists(id);
    return this.prisma.project.update({ where: { id }, data: { ...dto } });
  }

  /**
   * Deactivation, not deletion: reports reference projects historically, so a
   * hard delete would either orphan reports or cascade away real data. A
   * deactivated project disappears from the report form but still renders on
   * past reports and in analytics.
   */
  async deactivate(id: string) {
    await this.assertExists(id);
    return this.prisma.project.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async assertExists(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }
}
