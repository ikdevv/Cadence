import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

const ADMIN = 'admin-1';

describe('UsersService', () => {
  let service: UsersService;
  let tx: {
    user: { update: ReturnType<typeof vi.fn> };
    refreshToken: { updateMany: ReturnType<typeof vi.fn> };
  };
  let prisma: {
    user: Record<string, ReturnType<typeof vi.fn>>;
    refreshToken: Record<string, ReturnType<typeof vi.fn>>;
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    tx = {
      user: { update: vi.fn().mockResolvedValue({ id: 'user-2' }) },
      refreshToken: { updateMany: vi.fn() },
    };
    prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: 'user-2' }),
        update: vi.fn().mockResolvedValue({ id: 'user-2' }),
        findMany: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      refreshToken: { updateMany: vi.fn() },
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (c: unknown) => unknown)(tx) : arg,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(UsersService);
  });

  it('refuses to let an admin change their own role', async () => {
    await expect(
      service.updateRole(ADMIN, 'MEMBER', ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to let an admin deactivate themselves', async () => {
    await expect(
      service.updateStatus(ADMIN, false, ADMIN),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revokes refresh tokens when deactivating someone', async () => {
    await service.updateStatus('user-2', false, ADMIN);

    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-2', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('leaves sessions alone when reactivating someone', async () => {
    await service.updateStatus('user-2', true, ADMIN);

    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
