import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { hashToken } from '../../common/utils/hash-token.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import type {
  Invitation,
  InvitationStatus,
  Role,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { EmailService } from '../email/email.service.js';
import { UsersService } from '../users/users.service.js';
import type { AcceptInvitationDto } from './dto/accept-invitation.dto.js';
import type { CreateInvitationDto } from './dto/create-invitation.dto.js';

const PASSWORD_SALT_ROUNDS = 12;
const TOKEN_BYTES = 32;
const DEFAULT_TTL_HOURS = 48;

type ValidateResult =
  | { valid: true; email: string; role: Role; expiresAt: Date }
  | {
      valid: false;
      reason: 'INVALID' | 'EXPIRED' | 'CANCELLED' | 'ACCEPTED';
    };

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateInvitationDto, invitedBy: AuthenticatedUser) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser && existingUser.isActive) {
      throw new ConflictException('User already exists');
    }

    const existingPending = await this.prisma.invitation.findFirst({
      where: {
        email: dto.email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
    if (existingPending) {
      throw new ConflictException(
        'A pending invitation already exists for this email',
      );
    }

    const rawToken = this.generateToken();
    const expiresAt = new Date(
      Date.now() + this.getInvitationTtlHours() * 60 * 60 * 1000,
    );

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        role: dto.role,
        tokenHash: hashToken(rawToken),
        expiresAt,
        invitedById: invitedBy.id,
      },
      include: { invitedBy: true },
    });

    this.logger.log(`INVITATION_CREATED ${invitation.id} for ${dto.email}`);
    await this.sendInvitationEmail(invitation, invitedBy.email, rawToken);

    return this.toPublicInvitation(invitation, invitation.invitedBy.name);
  }

  async list(status?: InvitationStatus) {
    const invitations = await this.prisma.invitation.findMany({
      where: status ? { status } : undefined,
      include: { invitedBy: true },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map((invitation) =>
      this.toPublicInvitation(invitation, invitation.invitedBy.name),
    );
  }

  async validate(rawToken: string): Promise<ValidateResult> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });

    if (!invitation) {
      return { valid: false, reason: 'INVALID' };
    }
    if (invitation.status === 'CANCELLED') {
      return { valid: false, reason: 'CANCELLED' };
    }
    if (invitation.status === 'ACCEPTED') {
      return { valid: false, reason: 'ACCEPTED' };
    }
    if (invitation.expiresAt <= new Date()) {
      return { valid: false, reason: 'EXPIRED' };
    }

    return {
      valid: true,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    };
  }

  async accept(dto: AcceptInvitationDto) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: hashToken(dto.token) },
    });

    if (!invitation || invitation.status !== 'PENDING') {
      throw new BadRequestException('Invalid or already-used invitation');
    }
    if (invitation.expiresAt <= new Date()) {
      throw new BadRequestException('Invitation has expired');
    }

    const existingUser = await this.usersService.findByEmail(
      invitation.email,
    );
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const passwordHash = await hash(dto.password, PASSWORD_SALT_ROUNDS);
    const name = `${dto.firstName} ${dto.lastName}`.trim();

    const user = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          name,
          role: invitation.role,
          isActive: true,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });

      return createdUser;
    });

    this.logger.log(
      `INVITATION_ACCEPTED ${invitation.id} — USER_CREATED_FROM_INVITATION ${user.id}`,
    );

    return this.authService.issueSessionFor(user);
  }

  async resend(id: string, actor: AuthenticatedUser) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending invitations can be resent',
      );
    }

    const rawToken = this.generateToken();

    const updated = await this.prisma.invitation.update({
      where: { id },
      data: {
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(
          Date.now() + this.getInvitationTtlHours() * 60 * 60 * 1000,
        ),
      },
      include: { invitedBy: true },
    });

    this.logger.log(`INVITATION_RESENT ${invitation.id}`);
    await this.sendInvitationEmail(updated, actor.email, rawToken);

    return this.toPublicInvitation(updated, updated.invitedBy.name);
  }

  async cancel(id: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id },
    });
    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(
        'Only pending invitations can be cancelled',
      );
    }

    const updated = await this.prisma.invitation.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { invitedBy: true },
    });

    this.logger.log(`INVITATION_CANCELLED ${invitation.id}`);
    return this.toPublicInvitation(updated, updated.invitedBy.name);
  }

  private generateToken(): string {
    return randomBytes(TOKEN_BYTES).toString('hex');
  }

  private getInvitationTtlHours(): number {
    const raw = this.configService.get<string>('INVITATION_TTL_HOURS');
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : DEFAULT_TTL_HOURS;
  }

  private async sendInvitationEmail(
    invitation: Invitation,
    invitedByEmail: string,
    rawToken: string,
  ) {
    const webOrigin = this.configService.get<string>(
      'CORS_ORIGIN',
      'http://localhost:3000',
    );
    const link = `${webOrigin}/invitations/accept/${rawToken}`;

    await this.emailService.send({
      to: invitation.email,
      subject: "You've been invited to join Cadence",
      text: [
        "You've been invited to join our application.",
        '',
        `You have been invited by ${invitedByEmail}.`,
        `Role: ${invitation.role}`,
        '',
        `Accept your invitation: ${link}`,
        '',
        'This invitation expires in 48 hours.',
      ].join('\n'),
    });
    this.logger.log(`INVITATION_SENT ${invitation.id}`);
  }

  /** Strips tokenHash and other internal fields before returning to the client. */
  private toPublicInvitation(
    invitation: Invitation,
    invitedByName: string,
  ) {
    const effectiveStatus: InvitationStatus =
      invitation.status === 'PENDING' && invitation.expiresAt <= new Date()
        ? 'EXPIRED'
        : invitation.status;

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: effectiveStatus,
      invitedById: invitation.invitedById,
      invitedByName,
      expiresAt: invitation.expiresAt.toISOString(),
      acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
      createdAt: invitation.createdAt.toISOString(),
    };
  }
}
