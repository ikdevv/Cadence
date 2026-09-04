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

  @Get('reports/:id')
  findOne(@Param('id') id: string) {
    return this.teamReports.findOne(id);
  }

  @Get('reports/:id/versions/:versionNumber')
  findVersion(
    @Param('id') id: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    return this.teamReports.findVersion(id, versionNumber);
  }
}
