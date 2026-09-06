import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import {
  CreateUserDto,
  ListUsersDto,
  UpdateRoleDto,
  UpdateStatusDto,
} from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('MANAGER', 'ADMIN')
  @Get()
  list(@Query() query: ListUsersDto) {
    return this.usersService.list(query);
  }

  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.createByAdmin(dto);
  }

  /** `:id` here is the public identifier — profile() resolves it to the internal id. */
  @Roles('MANAGER', 'ADMIN')
  @Get(':id')
  profile(@Param('id') publicId: string) {
    return this.usersService.profile(publicId);
  }

  @Roles('ADMIN')
  @Patch(':id/role')
  updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updateRole(id, dto.role, actor.id);
  }

  @Roles('ADMIN')
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.updateStatus(id, dto.isActive, actor.id);
  }
}
