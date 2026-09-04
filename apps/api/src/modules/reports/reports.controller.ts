import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { ListReportsDto } from './dto/list-reports.dto.js';
import { ReportContentDto } from './dto/report-content.dto.js';
import { ReportsService } from './reports.service.js';

/**
 * Own-report routes only. Every handler scopes to the JWT's user id, which is
 * never accepted from a param, query or body — so there is no
 * `GET /reports?userId=x`. Managers read team reports through /team/* instead,
 * and this whole controller is MEMBER-only so no manager request can ever reach
 * a content write.
 */
@Roles('MEMBER')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListReportsDto,
  ) {
    return this.reportsService.listOwn(user.id, query);
  }

  @Get('weeks/available')
  availableWeeks(@CurrentUser() user: AuthenticatedUser) {
    return this.reportsService.availableWeeks(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(user.id, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reportsService.findOwn(id, user.id);
  }

  @Patch(':id/content')
  updateContent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReportContentDto,
  ) {
    return this.reportsService.updateContent(id, user.id, dto);
  }

  @Post(':id/submit')
  submit(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reportsService.submit(id, user.id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.reportsService.remove(id, user.id);
  }

  @Get(':id/versions')
  listVersions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.reportsService.listVersions(id, user.id);
  }

  @Get(':id/versions/:versionNumber')
  findVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    return this.reportsService.findVersion(id, user.id, versionNumber);
  }
}
