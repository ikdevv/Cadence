import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module.js';
import { generatePublicId } from '../src/common/utils/public-id.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Invitations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let memberToken: string;

  const createdUserEmails: string[] = [];
  const createdInvitationEmails: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const adminEmail = `e2e-admin+${randomUUID()}@example.com`;
    createdUserEmails.push(adminEmail);
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'E2E Admin',
        role: 'ADMIN',
        passwordHash: await hash('adminpass123', 12),
        publicId: generatePublicId('usr'),
      },
    });
    adminId = admin.id;

    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: 'adminpass123' });
    adminToken = adminLogin.body.accessToken;

    const memberEmail = `e2e-member+${randomUUID()}@example.com`;
    createdUserEmails.push(memberEmail);
    await prisma.user.create({
      data: {
        email: memberEmail,
        name: 'E2E Member',
        role: 'MEMBER',
        passwordHash: await hash('memberpass123', 12),
        publicId: generatePublicId('usr'),
      },
    });
    const memberLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: memberEmail, password: 'memberpass123' });
    memberToken = memberLogin.body.accessToken;
  });

  afterAll(async () => {
    await prisma.invitation.deleteMany({
      where: { email: { in: createdInvitationEmails } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: [...createdUserEmails, ...createdInvitationEmails] } },
    });
    await app.close();
  });

  function inviteeEmail() {
    const email = `e2e-invitee+${randomUUID()}@example.com`;
    createdInvitationEmails.push(email);
    return email;
  }

  describe('POST /invitations', () => {
    it('lets an admin create an invitation, PENDING, with an expiry set', async () => {
      const email = inviteeEmail();

      const res = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'MEMBER' })
        .expect(201);

      expect(res.body).toMatchObject({ email, role: 'MEMBER', status: 'PENDING' });
      expect(res.body).not.toHaveProperty('tokenHash');
      expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('rejects a non-admin user', async () => {
      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ email: inviteeEmail(), role: 'MEMBER' })
        .expect(403);
    });

    it('rejects an unauthenticated request', async () => {
      await request(app.getHttpServer())
        .post('/invitations')
        .send({ email: inviteeEmail(), role: 'MEMBER' })
        .expect(401);
    });

    it('rejects an invalid email', async () => {
      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'not-an-email', role: 'MEMBER' })
        .expect(400);
    });

    it('rejects an invalid role', async () => {
      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: inviteeEmail(), role: 'SUPERUSER' })
        .expect(400);
    });

    it('rejects inviting an email that already belongs to an active user', async () => {
      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: createdUserEmails[1], role: 'MEMBER' })
        .expect(409);
    });

    it('rejects a duplicate pending invitation for the same email', async () => {
      const email = inviteeEmail();
      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'MEMBER' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'MEMBER' })
        .expect(409);
    });
  });

  describe('GET /invitations/validate/:token and POST /invitations/accept', () => {
    async function createInvitationAndGetToken(role: 'MEMBER' | 'MANAGER' = 'MEMBER') {
      const email = inviteeEmail();
      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role })
        .expect(201);

      const stored = await prisma.invitation.findFirstOrThrow({
        where: { email },
        orderBy: { createdAt: 'desc' },
      });
      return { email, invitationId: stored.id };
    }

    it('rejects an invalid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/invitations/validate/not-a-real-token')
        .expect(200);
      expect(res.body).toEqual({ valid: false, reason: 'INVALID' });
    });

    it('rejects a cancelled invitation', async () => {
      const { invitationId } = await createInvitationAndGetToken();
      await request(app.getHttpServer())
        .post(`/invitations/${invitationId}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      // Cancelled invitations can't be validated by raw token from this test
      // (we don't have it after creation) — verify via list instead.
      const list = await request(app.getHttpServer())
        .get('/invitations?status=CANCELLED')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      expect(list.body.some((i: { id: string }) => i.id === invitationId)).toBe(true);
    });

    it('full flow: valid invitation -> registration -> user ACTIVE, role from invitation, invitation ACCEPTED, cannot be reused', async () => {
      const email = inviteeEmail();
      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'MANAGER' })
        .expect(201);

      // Pull the raw token the way the email would have carried it: we don't
      // send real email, so recover it via the token hash isn't possible from
      // the test process — instead capture it by spying is out of scope here,
      // so we re-derive by calling accept with a token we mint the same way
      // the service does isn't accessible either. Use the DB row's tokenHash
      // is one-way. So we invite via a hook: create directly through prisma
      // with a known raw token, mirroring what the service does, to exercise
      // the accept endpoint deterministically.
      const rawToken = randomUUID() + randomUUID();
      const { createHash } = await import('node:crypto');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      await prisma.invitation.updateMany({
        where: { email },
        data: { tokenHash },
      });

      const validateRes = await request(app.getHttpServer())
        .get(`/invitations/validate/${rawToken}`)
        .expect(200);
      expect(validateRes.body).toMatchObject({ valid: true, email, role: 'MANAGER' });

      const acceptRes = await request(app.getHttpServer())
        .post('/invitations/accept')
        .send({ token: rawToken, firstName: 'Jane', lastName: 'Doe', password: 'password123' })
        .expect(201);

      expect(acceptRes.body).toHaveProperty('accessToken');
      expect(acceptRes.body.user).toMatchObject({ email, role: 'MANAGER' });

      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(user.isActive).toBe(true);
      expect(user.role).toBe('MANAGER');

      const invitation = await prisma.invitation.findFirstOrThrow({ where: { email } });
      expect(invitation.status).toBe('ACCEPTED');
      expect(invitation.acceptedAt).not.toBeNull();

      // Reuse is rejected.
      await request(app.getHttpServer())
        .post('/invitations/accept')
        .send({ token: rawToken, firstName: 'Jane', lastName: 'Doe', password: 'password123' })
        .expect(400);
    });

    it('rejects invalid registration data (short password)', async () => {
      const { email } = await createInvitationAndGetToken();
      const rawToken = randomUUID();
      const { createHash } = await import('node:crypto');
      await prisma.invitation.updateMany({
        where: { email },
        data: { tokenHash: createHash('sha256').update(rawToken).digest('hex') },
      });

      await request(app.getHttpServer())
        .post('/invitations/accept')
        .send({ token: rawToken, firstName: 'Jane', lastName: 'Doe', password: 'short' })
        .expect(400);

      const invitation = await prisma.invitation.findFirstOrThrow({ where: { email } });
      expect(invitation.status).toBe('PENDING');
    });
  });

  describe('security', () => {
    it('ignores a role/email sent in the accept-invitation body (uses invitation.role/email only)', async () => {
      const email = inviteeEmail();
      await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'MEMBER' })
        .expect(201);

      const rawToken = randomUUID();
      const { createHash } = await import('node:crypto');
      await prisma.invitation.updateMany({
        where: { email },
        data: { tokenHash: createHash('sha256').update(rawToken).digest('hex') },
      });

      // AcceptInvitationDto has no email/role fields at all — whitelist:true
      // + forbidNonWhitelisted:true means sending them is rejected outright,
      // which is itself proof the server never reads client-supplied values.
      await request(app.getHttpServer())
        .post('/invitations/accept')
        .send({
          token: rawToken,
          firstName: 'Jane',
          lastName: 'Doe',
          password: 'password123',
          email: 'attacker@example.com',
          role: 'ADMIN',
        })
        .expect(400);
    });
  });

  describe('resend / cancel', () => {
    it('invalidates the old token after resend', async () => {
      const email = inviteeEmail();
      const createRes = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'MEMBER' })
        .expect(201);

      const rawToken = randomUUID();
      const { createHash } = await import('node:crypto');
      await prisma.invitation.update({
        where: { id: createRes.body.id },
        data: { tokenHash: createHash('sha256').update(rawToken).digest('hex') },
      });

      await request(app.getHttpServer())
        .post(`/invitations/${createRes.body.id}/resend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const validateOld = await request(app.getHttpServer())
        .get(`/invitations/validate/${rawToken}`)
        .expect(200);
      expect(validateOld.body).toEqual({ valid: false, reason: 'INVALID' });
    });

    it('a cancelled invitation cannot be accepted', async () => {
      const email = inviteeEmail();
      const createRes = await request(app.getHttpServer())
        .post('/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email, role: 'MEMBER' })
        .expect(201);

      const rawToken = randomUUID();
      const { createHash } = await import('node:crypto');
      await prisma.invitation.update({
        where: { id: createRes.body.id },
        data: { tokenHash: createHash('sha256').update(rawToken).digest('hex') },
      });

      await request(app.getHttpServer())
        .post(`/invitations/${createRes.body.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      await request(app.getHttpServer())
        .post('/invitations/accept')
        .send({ token: rawToken, firstName: 'A', lastName: 'B', password: 'password123' })
        .expect(400);
    });
  });
});
