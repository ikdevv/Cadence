import { Injectable } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    passwordHash: string;
    name: string;
    role?: Role;
  }) {
    return this.prisma.user.create({ data });
  }

  listActiveMembers() {
    return this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
