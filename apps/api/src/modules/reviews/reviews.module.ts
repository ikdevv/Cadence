import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';
import { TeamController } from './team.controller.js';
import { TeamReportsService } from './team-reports.service.js';

@Module({
  imports: [ReportsModule],
  controllers: [ReviewsController, TeamController],
  providers: [ReviewsService, TeamReportsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
