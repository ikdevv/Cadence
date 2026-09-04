import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type { InvitationStatus } from '../../generated/prisma/client.js';
import { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import { CreateInvitationDto } from './dto/create-invitation.dto.js';
import { InvitationsService } from './invitations.service.js';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Roles('ADMIN')
  @Post()
  create(
    @Body() dto: CreateInvitationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.invitationsService.create(dto, actor);
  }

  @Roles('ADMIN')
  @Get()
  list(@Query('status') status?: InvitationStatus) {
    return this.invitationsService.list(status);
  }

  @Public()
  @Get('validate/:token')
  validate(@Param('token') token: string) {
    return this.invitationsService.validate(token);
  }

  @Public()
  @Post('accept')
  accept(@Body() dto: AcceptInvitationDto) {
    return this.invitationsService.accept(dto);
  }

  @Roles('ADMIN')
  @Post(':id/resend')
  resend(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.invitationsService.resend(id, actor);
  }

  @Roles('ADMIN')
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.invitationsService.cancel(id);
  }
}
