import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service.js';
import { EmailService } from '../email/email.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { InvitationsService } from './invitations.service.js';

const ADMIN = { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' as const };

function makeInvitation(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'inv-1',
    email: 'invitee@example.com',
    role: 'MEMBER',
    tokenHash: 'hashed',
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    acceptedAt: null,
    invitedById: ADMIN.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    invitedBy: { name: 'Admin' },
    ...overrides,
  };
}

describe('InvitationsService', () => {
  let service: InvitationsService;
  let prisma: {
    invitation: Record<string, ReturnType<typeof vi.fn>>;
    $transaction: ReturnType<typeof vi.fn>;
  };
  let usersService: { findByEmail: ReturnType<typeof vi.fn> };
  let authService: { issueSessionFor: ReturnType<typeof vi.fn> };
  let emailService: { send: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      invitation: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) =>
        cb({
          user: { create: vi.fn().mockResolvedValue({ id: 'user-1', email: 'invitee@example.com', role: 'MEMBER' }) },
          invitation: { update: vi.fn() },
        }),
      ),
    };
    usersService = { findByEmail: vi.fn() };
    authService = { issueSessionFor: vi.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r', user: {} }) };
    emailService = { send: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: UsersService, useValue: usersService },
        { provide: AuthService, useValue: authService },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: { get: vi.fn() } },
      ],
    }).compile();

    service = module.get(InvitationsService);
  });

  describe('create', () => {
    it('creates a PENDING invitation and sends an email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue(makeInvitation());

      const result = await service.create(
        { email: 'invitee@example.com', role: 'MEMBER' },
        ADMIN,
      );

      expect(result.status).toBe('PENDING');
      expect(emailService.send).toHaveBeenCalledTimes(1);
      expect(emailService.send.mock.calls[0][0].to).toBe('invitee@example.com');
    });

    it('rejects when an active user with that email already exists', async () => {
      usersService.findByEmail.mockResolvedValue({ isActive: true });

      await expect(
        service.create({ email: 'invitee@example.com', role: 'MEMBER' }, ADMIN),
      ).rejects.toThrow(ConflictException);
    });

    it('rejects a duplicate pending invitation for the same email', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(makeInvitation());

      await expect(
        service.create({ email: 'invitee@example.com', role: 'MEMBER' }, ADMIN),
      ).rejects.toThrow(ConflictException);
    });

    it('never returns the tokenHash', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue(makeInvitation());

      const result = await service.create(
        { email: 'invitee@example.com', role: 'MEMBER' },
        ADMIN,
      );

      expect(result).not.toHaveProperty('tokenHash');
    });
  });

  describe('validate', () => {
    it('returns valid:true for a pending, unexpired invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue(makeInvitation());

      const result = await service.validate('raw-token');

      expect(result).toMatchObject({ valid: true, email: 'invitee@example.com' });
    });

    it('returns INVALID when the token does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      const result = await service.validate('nope');

      expect(result).toEqual({ valid: false, reason: 'INVALID' });
    });

    it('returns EXPIRED for a pending but time-expired invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue(
        makeInvitation({ expiresAt: new Date(Date.now() - 1000) }),
      );

      const result = await service.validate('raw-token');

      expect(result).toEqual({ valid: false, reason: 'EXPIRED' });
    });

    it('returns CANCELLED for a cancelled invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue(makeInvitation({ status: 'CANCELLED' }));

      const result = await service.validate('raw-token');

      expect(result).toEqual({ valid: false, reason: 'CANCELLED' });
    });

    it('returns ACCEPTED for an already-accepted invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue(makeInvitation({ status: 'ACCEPTED' }));

      const result = await service.validate('raw-token');

      expect(result).toEqual({ valid: false, reason: 'ACCEPTED' });
    });
  });

  describe('accept', () => {
    const acceptDto = {
      token: 'raw-token',
      firstName: 'Jane',
      lastName: 'Doe',
      password: 'password123',
    };

    it('creates the user with the role and email from the invitation, then authenticates', async () => {
      prisma.invitation.findUnique.mockResolvedValue(makeInvitation());
      usersService.findByEmail.mockResolvedValue(null);

      const result = await service.accept(acceptDto);

      expect(authService.issueSessionFor).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'invitee@example.com', role: 'MEMBER' }),
      );
      expect(result).toHaveProperty('accessToken');
    });

    it('rejects an invalid token', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.accept(acceptDto)).rejects.toThrow(BadRequestException);
    });

    it('rejects an already-accepted invitation (no reuse)', async () => {
      prisma.invitation.findUnique.mockResolvedValue(makeInvitation({ status: 'ACCEPTED' }));

      await expect(service.accept(acceptDto)).rejects.toThrow(BadRequestException);
    });

    it('rejects an expired invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue(
        makeInvitation({ expiresAt: new Date(Date.now() - 1000) }),
      );

      await expect(service.accept(acceptDto)).rejects.toThrow(BadRequestException);
    });

    it('rejects when the email became a registered user in the meantime', async () => {
      prisma.invitation.findUnique.mockResolvedValue(makeInvitation());
      usersService.findByEmail.mockResolvedValue({ id: 'someone' });

      await expect(service.accept(acceptDto)).rejects.toThrow(ConflictException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('resend', () => {
    it('issues a new token and keeps status PENDING', async () => {
      prisma.invitation.findUnique.mockResolvedValue(makeInvitation());
      prisma.invitation.update.mockResolvedValue(makeInvitation());

      const result = await service.resend('inv-1', ADMIN);

      expect(result.status).toBe('PENDING');
      expect(emailService.send).toHaveBeenCalledTimes(1);
    });

    it('rejects resending a non-pending invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue(makeInvitation({ status: 'CANCELLED' }));

      await expect(service.resend('inv-1', ADMIN)).rejects.toThrow(BadRequestException);
    });

    it('404s when the invitation does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.resend('missing', ADMIN)).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('moves a pending invitation to CANCELLED', async () => {
      prisma.invitation.findUnique.mockResolvedValue(makeInvitation());
      prisma.invitation.update.mockResolvedValue(makeInvitation({ status: 'CANCELLED' }));

      const result = await service.cancel('inv-1');

      expect(result.status).toBe('CANCELLED');
    });

    it('rejects cancelling a non-pending invitation', async () => {
      prisma.invitation.findUnique.mockResolvedValue(makeInvitation({ status: 'ACCEPTED' }));

      await expect(service.cancel('inv-1')).rejects.toThrow(BadRequestException);
    });
  });
});
