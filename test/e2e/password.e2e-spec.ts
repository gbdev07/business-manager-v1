import { INestApplication } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as request from 'supertest';
import { PrismaService } from '@/prisma/prisma.service';
import { FORGOT_PASSWORD_MESSAGE } from '@core/auth/auth.controller';
import { PasswordService } from '@core/auth/password.service';
import { hashToken } from '@core/auth/token.service';
import { EmailNotificationProvider } from '@core/notifications/providers/smtp-email.provider';
import { CapturingEmailProvider } from '../utils/capturing-email.provider';
import { API, createTestApp, uniqueSuffix } from '../utils/create-test-app';

const PASSWORD = 'StrongPass123!';
const NEW_PASSWORD = 'BrandNew456!';

interface Account {
  email: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}

describe('Password recovery and change (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let prisma: PrismaService;
  let passwordService: PasswordService;
  const mailbox = new CapturingEmailProvider();

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder.overrideProvider(EmailNotificationProvider).useValue(mailbox),
    );
    http = request(app.getHttpServer());
    prisma = app.get(PrismaService);
    passwordService = app.get(PasswordService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerAccount(): Promise<Account> {
    const suffix = uniqueSuffix();
    const res = await http
      .post(`${API}/auth/register`)
      .send({
        businessName: `Senha ${suffix}`,
        businessType: 'SERVICES',
        ownerName: 'Titular da Conta',
        email: `password${suffix}@test.com`,
        password: PASSWORD,
      })
      .expect(201);

    return {
      email: res.body.user.email,
      userId: res.body.user.id,
      accessToken: res.body.accessToken,
      refreshToken: res.body.refreshToken,
    };
  }

  async function requestResetToken(email: string): Promise<string> {
    await http.post(`${API}/auth/forgot-password`).send({ email }).expect(202);
    await passwordService.drainPendingRequests();
    const token = mailbox.lastResetToken(email);
    if (!token) throw new Error(`No reset e-mail captured for ${email}`);
    return token;
  }

  /** Stores a token directly, as the forgot-password flow would, and returns the raw value. */
  async function insertResetToken(userId: string, expiresAt: Date): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    });
    return token;
  }

  const inOneHour = () => new Date(Date.now() + 60 * 60_000);

  const login = (email: string, password: string) =>
    http.post(`${API}/auth/login`).send({ email, password });

  const reset = (token: string, password = NEW_PASSWORD) =>
    http
      .post(`${API}/auth/reset-password`)
      .send({ token, newPassword: password, confirmPassword: password });

  describe('POST /auth/forgot-password', () => {
    it('sends a single-use link to a registered e-mail and stores only the token hash', async () => {
      const account = await registerAccount();

      const res = await http
        .post(`${API}/auth/forgot-password`)
        .send({ email: account.email })
        .expect(202);
      expect(res.body).toEqual({ message: FORGOT_PASSWORD_MESSAGE });

      await passwordService.drainPendingRequests();
      const [message] = mailbox.messagesTo(account.email);
      expect(message.subject).toBe('Redefinição de senha');
      expect(message.sensitive).toBe(true);
      expect(message.body).toContain('http://localhost:3001/reset-password?token=');
      expect(message.body).toContain('30 minutos');

      const token = mailbox.lastResetToken(account.email)!;
      const stored = await prisma.passwordResetToken.findMany({
        where: { userId: account.userId },
      });
      expect(stored).toHaveLength(1);
      expect(stored[0].tokenHash).toBe(hashToken(token));
      expect(stored[0].tokenHash).not.toContain(token);
      expect(stored[0].usedAt).toBeNull();

      const ttlMinutes = (stored[0].expiresAt.getTime() - stored[0].createdAt.getTime()) / 60_000;
      expect(Math.round(ttlMinutes)).toBe(30);

      expect(await prisma.passwordResetToken.count({ where: { tokenHash: token } })).toBe(0);
    });

    it('answers an unregistered e-mail exactly like a registered one, without sending anything', async () => {
      const account = await registerAccount();
      const unknown = `nobody${uniqueSuffix()}@test.com`;

      const registered = await http
        .post(`${API}/auth/forgot-password`)
        .send({ email: account.email });
      const unregistered = await http.post(`${API}/auth/forgot-password`).send({ email: unknown });

      expect(unregistered.status).toBe(registered.status);
      expect(unregistered.body).toEqual(registered.body);
      expect(unregistered.body).toEqual({ message: FORGOT_PASSWORD_MESSAGE });

      await passwordService.drainPendingRequests();
      expect(mailbox.messagesTo(unknown)).toHaveLength(0);
      expect(mailbox.messagesTo(account.email)).toHaveLength(1);
    });

    it('normalizes the e-mail (case and surrounding spaces)', async () => {
      const account = await registerAccount();

      await http
        .post(`${API}/auth/forgot-password`)
        .send({ email: `  ${account.email.toUpperCase()}  ` })
        .expect(202);
      await passwordService.drainPendingRequests();

      expect(mailbox.messagesTo(account.email)).toHaveLength(1);
    });

    it('keeps the generic answer and discards the token when the e-mail cannot be sent', async () => {
      const account = await registerAccount();
      mailbox.failing = true;

      try {
        const res = await http
          .post(`${API}/auth/forgot-password`)
          .send({ email: account.email })
          .expect(202);
        expect(res.body).toEqual({ message: FORGOT_PASSWORD_MESSAGE });
        await passwordService.drainPendingRequests();
      } finally {
        mailbox.failing = false;
      }

      expect(await prisma.passwordResetToken.count({ where: { userId: account.userId } })).toBe(0);
    });

    it('rejects a malformed e-mail', async () => {
      await http.post(`${API}/auth/forgot-password`).send({ email: 'not-an-email' }).expect(400);
    });
  });

  describe('POST /auth/reset-password', () => {
    it('sets the new password, consumes the token and revokes every session', async () => {
      const account = await registerAccount();
      const session = (await login(account.email, PASSWORD).expect(200)).body;
      const token = await requestResetToken(account.email);

      const res = await reset(token).expect(200);
      expect(res.body).toEqual({ message: 'Senha redefinida com sucesso. Faça login novamente.' });
      expect(res.body).not.toHaveProperty('accessToken');

      await login(account.email, PASSWORD).expect(401);
      await login(account.email, NEW_PASSWORD).expect(200);

      const user = await prisma.user.findUniqueOrThrow({ where: { id: account.userId } });
      expect(user.passwordHash).not.toBe(NEW_PASSWORD);
      expect(user.passwordChangedAt).not.toBeNull();

      const stored = await prisma.passwordResetToken.findUniqueOrThrow({
        where: { tokenHash: hashToken(token) },
      });
      expect(stored.usedAt).not.toBeNull();

      // Sessions issued before the reset no longer work: refresh and access tokens alike.
      for (const refreshToken of [account.refreshToken, session.refreshToken]) {
        await http.post(`${API}/auth/refresh`).send({ refreshToken }).expect(401);
      }
      await http
        .get(`${API}/auth/me`)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(401);
    });

    it('rejects a token that was already used', async () => {
      const account = await registerAccount();
      const token = await requestResetToken(account.email);

      await reset(token).expect(200);
      const res = await reset(token, 'AnotherOne789!').expect(400);
      expect(res.body.message).toBe('Invalid or expired password reset token');

      await login(account.email, NEW_PASSWORD).expect(200);
    });

    it('rejects an unknown token', async () => {
      const res = await reset(randomBytes(32).toString('base64url')).expect(400);
      expect(res.body.message).toBe('Invalid or expired password reset token');
    });

    it('rejects an expired token', async () => {
      const account = await registerAccount();
      const token = await insertResetToken(account.userId, new Date(Date.now() - 1000));

      await reset(token).expect(400);
      await login(account.email, PASSWORD).expect(200);
    });

    it('rejects passwords outside the policy or not confirmed, keeping the token usable', async () => {
      const account = await registerAccount();
      const token = await requestResetToken(account.email);

      await reset(token, 'weak').expect(400);
      await reset(token, 'alllowercase1').expect(400);
      await http
        .post(`${API}/auth/reset-password`)
        .send({ token, newPassword: NEW_PASSWORD, confirmPassword: 'Different123!' })
        .expect(400);

      const stored = await prisma.passwordResetToken.findUniqueOrThrow({
        where: { tokenHash: hashToken(token) },
      });
      expect(stored.usedAt).toBeNull();
      await reset(token).expect(200);
    });

    it('invalidates the other pending tokens of the user', async () => {
      const account = await registerAccount();
      const first = await insertResetToken(account.userId, inOneHour());
      const second = await insertResetToken(account.userId, inOneHour());

      await reset(first).expect(200);
      await reset(second, 'AnotherOne789!').expect(400);

      expect(
        await prisma.passwordResetToken.count({
          where: { userId: account.userId, usedAt: null },
        }),
      ).toBe(0);
    });

    it('a new request replaces the previous link', async () => {
      const account = await registerAccount();
      const old = await insertResetToken(account.userId, inOneHour());
      // Backdate it past the per-account cooldown.
      await prisma.passwordResetToken.updateMany({
        where: { tokenHash: hashToken(old) },
        data: { createdAt: new Date(Date.now() - 5 * 60_000) },
      });

      const fresh = await requestResetToken(account.email);

      await reset(old).expect(400);
      await reset(fresh).expect(200);
    });

    it('accepts only one of two concurrent attempts with the same token', async () => {
      const account = await registerAccount();
      const token = await insertResetToken(account.userId, inOneHour());

      const [a, b] = await Promise.all([
        reset(token, 'ConcurrentA1!'),
        reset(token, 'ConcurrentB2!'),
      ]);

      expect([a.status, b.status].sort()).toEqual([200, 400]);
      const winner = a.status === 200 ? 'ConcurrentA1!' : 'ConcurrentB2!';
      const loser = a.status === 200 ? 'ConcurrentB2!' : 'ConcurrentA1!';
      await login(account.email, winner).expect(200);
      await login(account.email, loser).expect(401);
    });
  });

  describe('PATCH /auth/change-password', () => {
    const change = (accessToken: string, body: Record<string, unknown>) =>
      http
        .patch(`${API}/auth/change-password`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(body);

    it('changes the password and revokes every session, including the current one', async () => {
      const account = await registerAccount();
      const other = (await login(account.email, PASSWORD).expect(200)).body;

      const res = await change(account.accessToken, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }).expect(200);
      expect(res.body).toEqual({ message: 'Senha alterada com sucesso. Faça login novamente.' });

      for (const accessToken of [account.accessToken, other.accessToken]) {
        await http.get(`${API}/auth/me`).set('Authorization', `Bearer ${accessToken}`).expect(401);
      }
      for (const refreshToken of [account.refreshToken, other.refreshToken]) {
        await http.post(`${API}/auth/refresh`).send({ refreshToken }).expect(401);
      }
      expect(
        await prisma.refreshToken.count({ where: { userId: account.userId, revokedAt: null } }),
      ).toBe(0);

      await login(account.email, PASSWORD).expect(401);
      const relogin = await login(account.email, NEW_PASSWORD).expect(200);
      await http
        .get(`${API}/auth/me`)
        .set('Authorization', `Bearer ${relogin.body.accessToken}`)
        .expect(200);
    });

    it('rejects a wrong current password', async () => {
      const account = await registerAccount();

      const res = await change(account.accessToken, {
        currentPassword: 'WrongPass123!',
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }).expect(400);
      expect(res.body.message).toBe('Current password is incorrect');

      await login(account.email, PASSWORD).expect(200);
    });

    it('rejects a new password equal to the current one', async () => {
      const account = await registerAccount();

      await change(account.accessToken, {
        currentPassword: PASSWORD,
        newPassword: PASSWORD,
        confirmPassword: PASSWORD,
      }).expect(400);
    });

    it('validates the policy and the confirmation', async () => {
      const account = await registerAccount();

      await change(account.accessToken, {
        currentPassword: PASSWORD,
        newPassword: 'short',
        confirmPassword: 'short',
      }).expect(400);
      await change(account.accessToken, {
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: 'Mismatch123!',
      }).expect(400);
    });

    it('requires authentication', async () => {
      await http
        .patch(`${API}/auth/change-password`)
        .send({
          currentPassword: PASSWORD,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD,
        })
        .expect(401);
    });

    it("cannot target another user's account", async () => {
      const attacker = await registerAccount();
      const victim = await registerAccount();

      // Selecting the account through the payload is not part of the contract.
      await change(attacker.accessToken, {
        userId: victim.userId,
        currentPassword: PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }).expect(400);

      await login(victim.email, PASSWORD).expect(200);
      await login(attacker.email, PASSWORD).expect(200);
    });
  });
});
