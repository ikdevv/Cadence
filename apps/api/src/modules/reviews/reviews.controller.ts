import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { ApproveDto, RequestChangesDto } from './dto/review.dto.js';
import { ReviewsService } from './reviews.service.js';

@Roles('MANAGER', 'ADMIN')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @HttpCode(HttpStatus.OK)
  @Post(':reportId/approve')
  approve(
    @Param('reportId') reportId: string,
    @CurrentUser() reviewer: AuthenticatedUser,
    @Body() dto: ApproveDto,
  ) {
    return this.reviewsService.approve(reportId, reviewer.id, dto.comment);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':reportId/request-changes')
  requestChanges(
    @Param('reportId') reportId: string,
    @CurrentUser() reviewer: AuthenticatedUser,
    @Body() dto: RequestChangesDto,
  ) {
    return this.reviewsService.requestChanges(
      reportId,
      reviewer.id,
      dto.comment,
    );
  }

  @Get(':reportId/history')
  history(@Param('reportId') reportId: string) {
    return this.reviewsService.history(reportId);
  }
}
