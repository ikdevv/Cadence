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

  /** `:reportId` is the report's public identifier throughout this controller. */
  @HttpCode(HttpStatus.OK)
  @Post(':reportId/approve')
  approve(
    @Param('reportId') publicId: string,
    @CurrentUser() reviewer: AuthenticatedUser,
    @Body() dto: ApproveDto,
  ) {
    return this.reviewsService.approve(publicId, reviewer.id, dto.comment);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':reportId/request-changes')
  requestChanges(
    @Param('reportId') publicId: string,
    @CurrentUser() reviewer: AuthenticatedUser,
    @Body() dto: RequestChangesDto,
  ) {
    return this.reviewsService.requestChanges(
      publicId,
      reviewer.id,
      dto.comment,
    );
  }

  @Get(':reportId/history')
  async history(@Param('reportId') publicId: string) {
    const reportId = await this.reviewsService.resolveIdByPublicId(publicId);
    return this.reviewsService.history(reportId);
  }
}
