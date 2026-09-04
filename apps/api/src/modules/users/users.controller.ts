import { Controller, Get } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('ADMIN')
  @Get()
  async list() {
    const users = await this.usersService.listActiveMembers();
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    }));
  }
}
