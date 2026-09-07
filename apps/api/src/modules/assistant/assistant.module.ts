import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { ReviewsModule } from '../reviews/reviews.module.js';
import { AI_PROVIDER } from './ai/ai-provider.interface.js';
import { HuggingFaceProvider } from './ai/huggingface.provider.js';
import { AssistantContextService } from './assistant-context.service.js';
import { AssistantController } from './assistant.controller.js';
import { AssistantRateLimitService } from './assistant-rate-limit.service.js';
import { AssistantService } from './assistant.service.js';

@Module({
  imports: [AnalyticsModule, ReportsModule, ReviewsModule],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    AssistantContextService,
    AssistantRateLimitService,
    { provide: AI_PROVIDER, useClass: HuggingFaceProvider },
  ],
})
export class AssistantModule {}
