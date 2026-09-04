import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectsService } from './projects.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /** Any authenticated user — members need this for the report form's select. */
  @Get()
  list(@Query('includeInactive') includeInactive?: string) {
    return this.projectsService.list(includeInactive === 'true');
  }

  @Roles('MANAGER', 'ADMIN')
  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Roles('MANAGER', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @Roles('MANAGER', 'ADMIN')
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.projectsService.deactivate(id);
  }
}
