import { Module } from '@nestjs/common';
import { ReportVersionsService } from './report-versions.service.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, ReportVersionsService],
  exports: [ReportsService, ReportVersionsService],
})
export class ReportsModule {}
