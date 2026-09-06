import { Controller, Get, ParseIntPipe, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AnalyticsService } from './analytics.service.js';

@Roles('MANAGER', 'ADMIN')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary(@Query('week') week?: string) {
    return this.analytics.summary(week);
  }

  @Get('trends')
  trends(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('userId') userId?: string,
  ) {
    return this.analytics.trends(from, to, userId);
  }

  @Get('status-by-member')
  statusByMember(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.statusByMember(from, to);
  }

  @Get('by-project')
  byProject(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.byProject(from, to);
  }

  @Get('time-by-type')
  timeByType(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.timeByType(from, to);
  }

  @Get('activity')
  activity(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.analytics.activity(limit ?? 20);
  }
}
