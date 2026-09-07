import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { ListTeamReportsDto } from './dto/list-team-reports.dto.js';
import { TeamReportsService } from './team-reports.service.js';

@Roles('MANAGER', 'ADMIN')
@Controller('team')
export class TeamController {
  constructor(private readonly teamReports: TeamReportsService) {}

  @Get('reports')
  list(@Query() query: ListTeamReportsDto) {
    return this.teamReports.list(query);
  }

  /** `:id` is the report's public identifier — resolved to the internal id downstream. */
  @Get('reports/:id')
  findOne(@Param('id') publicId: string) {
    return this.teamReports.findOne(publicId);
  }

  @Get('reports/:id/versions/:versionNumber')
  findVersion(
    @Param('id') publicId: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    return this.teamReports.findVersion(publicId, versionNumber);
  }
}
