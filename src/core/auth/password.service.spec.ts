import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantStatus } from '@prisma/client';
import { AuthenticatedUser } from '@common/types/authenticated-user';
import { AuditAction } from '@core/audit/audit.constants';
import { AuditService } from '@core/audit/audit.service';
import { AuthRepository, AuthUserRecord } from '@core/auth/auth.repository';
import { PasswordService } from '@core/auth/password.service';
import { hashToken } from '@core/auth/token.service';
import { NotificationsService } from '@core/notifications/notifications.service';
import {
  NotificationChannel,
  NotificationMessage,
  NotificationResult,
} from '@core/notifications/providers/notification-provider.interface';

const RESET_URL = 'https://app.example.com/reset-password';

function buildUser(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: 'user-1',
    tenantId: 'tenant-1',
    roleId: 'role-1',
    name: 'Maria',
    email: 'maria@example.com',
    passwordHash: 'stored-hash',
    isActive: true,
    lastLoginAt: null,
    sessionVersion: 0,
    passwordChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {} as AuthUserRecord['role'],
    tenant: { id: 'tenant-1', status: TenantStatus.ACTIVE, businessType: 'BARBERSHOP' },
    ...overrides,
  };
}

describe('PasswordService', () => {
  let repository: jest.Mocked<
    Pick<
      AuthRepository,
      | 'findUserByEmail'
      | 'findUserById'
      | 'findLatestPasswordResetToken'
      | 'replacePasswordResetToken'
      | 'deletePasswordResetToken'
      | 'deleteExpiredPasswordResetTokens'
      | 'consumePasswordResetToken'
      | 'updatePassword'
    >
  >;
  let hasher: { hash: jest.Mock; compare: jest.Mock };
  let notifications: { send: jest.Mock<Promise<NotificationResult>, [NotificationMessage]> };
  let audit: { record: jest.Mock };
  let config: Record<string, unknown>;

  const createService = () =>
    new PasswordService(
      repository as unknown as AuthRepository,
      hasher,
      notifications as unknown as NotificationsService,
      audit as unknown as AuditService,
      {
        get: (key: string) => config[key],
        getOrThrow: (key: string) => config[key],
      } as unknown as ConfigService,
    );

  beforeEach(() => {
    repository = {
      findUserByEmail: jest.fn(),
      findUserById: jest.fn(),
      findLatestPasswordResetToken: jest.fn().mockResolvedValue(null),
      replacePasswordResetToken: jest.fn().mockResolvedValue({ id: 'token-1' }),
      deletePasswordResetToken: jest.fn(),
      deleteExpiredPasswordResetTokens: jest.fn().mockResolvedValue(0),
      consumePasswordResetToken: jest.fn(),
      updatePassword: jest.fn(),
    };
    hasher = { hash: jest.fn().mockResolvedValue('new-hash'), compare: jest.fn() };
    notifications = {
      send: jest.fn<Promise<NotificationResult>, [NotificationMessage]>(),
    };
    notifications.send.mockResolvedValue({ channel: NotificationChannel.EMAIL, status: 'SENT' });
    audit = { record: jest.fn() };
    config = {
      'passwordReset.url': RESET_URL,
      'passwordReset.tokenTtlMinutes': 30,
      'passwordReset.requestCooldownSeconds': 60,
    };
  });

  describe('processPasswordResetRequest', () => {
    it('stores only the hash of a random token and e-mails the raw token in the link', async () => {
      repository.findUserByEmail.mockResolvedValue(buildUser());

      await createService().processPasswordResetRequest('maria@example.com', '10.0.0.1');

      const [message] = notifications.send.mock.calls[0];
      expect(message).toMatchObject({
        channel: NotificationChannel.EMAIL,
        to: 'maria@example.com',
        sensitive: true,
      });
      const token = new URL(message.body.match(/https:\S+/)![0]).searchParams.get('token')!;
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);

      const stored = repository.replacePasswordResetToken.mock.calls[0][0];
      expect(stored.tokenHash).toBe(hashToken(token));
      expect(stored.tokenHash).not.toBe(token);
      const ttl = stored.expiresAt.getTime() - Date.now();
      expect(ttl).toBeGreaterThan(29 * 60_000);
      expect(ttl).toBeLessThanOrEqual(30 * 60_000);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.AUTH_PASSWORD_RESET_REQUESTED,
          userId: 'user-1',
          metadata: { delivery: 'SENT' },
        }),
      );
      expect(JSON.stringify(audit.record.mock.calls)).not.toContain(token);
    });

    it('does nothing for an unregistered e-mail', async () => {
      repository.findUserByEmail.mockResolvedValue(null);

      await createService().processPasswordResetRequest('ghost@example.com');

      expect(repository.replacePasswordResetToken).not.toHaveBeenCalled();
      expect(notifications.send).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it.each([
      ['an inactive user', buildUser({ isActive: false })],
      [
        'a suspended tenant',
        buildUser({
          tenant: { id: 'tenant-1', status: TenantStatus.SUSPENDED, businessType: 'BARBERSHOP' },
        }),
      ],
    ])('does nothing for %s', async (_label, user) => {
      repository.findUserByEmail.mockResolvedValue(user);

      await createService().processPasswordResetRequest('maria@example.com');

      expect(notifications.send).not.toHaveBeenCalled();
    });

    it.each(['FAILED', 'SKIPPED'])('discards the token when delivery is %s', async (status) => {
      repository.findUserByEmail.mockResolvedValue(buildUser());
      notifications.send.mockResolvedValue({
        channel: NotificationChannel.EMAIL,
        status: status as NotificationResult['status'],
      });

      await createService().processPasswordResetRequest('maria@example.com');

      expect(repository.deletePasswordResetToken).toHaveBeenCalledWith('token-1');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { delivery: status } }),
      );
    });

    it('ignores repeated requests inside the cooldown window', async () => {
      repository.findUserByEmail.mockResolvedValue(buildUser());
      repository.findLatestPasswordResetToken.mockResolvedValue({
        createdAt: new Date(Date.now() - 10_000),
      } as never);

      await createService().processPasswordResetRequest('maria@example.com');

      expect(repository.replacePasswordResetToken).not.toHaveBeenCalled();
      expect(notifications.send).not.toHaveBeenCalled();
    });

    it('does not issue tokens when PASSWORD_RESET_URL is not configured', async () => {
      config['passwordReset.url'] = undefined;
      repository.findUserByEmail.mockResolvedValue(buildUser());

      await createService().processPasswordResetRequest('maria@example.com');

      expect(repository.replacePasswordResetToken).not.toHaveBeenCalled();
    });

    it('cleans up expired tokens on every request', async () => {
      repository.findUserByEmail.mockResolvedValue(null);

      await createService().processPasswordResetRequest('ghost@example.com');

      expect(repository.deleteExpiredPasswordResetTokens).toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('returns immediately and never propagates processing errors', async () => {
      repository.deleteExpiredPasswordResetTokens.mockRejectedValue(new Error('db down'));
      const service = createService();

      expect(() => service.requestPasswordReset('maria@example.com')).not.toThrow();
      await expect(service.drainPendingRequests()).resolves.toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('consumes the hashed token with the new password hash', async () => {
      repository.consumePasswordResetToken.mockResolvedValue({
        id: 'user-1',
        tenantId: 'tenant-1',
      });

      await createService().resetPassword('raw-token', 'NewPass123!');

      expect(hasher.hash).toHaveBeenCalledWith('NewPass123!');
      expect(repository.consumePasswordResetToken).toHaveBeenCalledWith(
        hashToken('raw-token'),
        'new-hash',
        expect.any(Date),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.AUTH_PASSWORD_RESET_COMPLETED }),
      );
    });

    it('rejects invalid, expired or used tokens', async () => {
      repository.consumePasswordResetToken.mockResolvedValue(null);

      await expect(createService().resetPassword('raw-token', 'NewPass123!')).rejects.toThrow(
        BadRequestException,
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.AUTH_PASSWORD_RESET_FAILED }),
      );
      expect(JSON.stringify(audit.record.mock.calls)).not.toContain('raw-token');
    });
  });

  describe('changePassword', () => {
    const currentUser = { id: 'user-1' } as AuthenticatedUser;

    beforeEach(() => {
      repository.findUserById.mockResolvedValue(buildUser());
    });

    it('updates the password of the authenticated user', async () => {
      hasher.compare.mockResolvedValue(true);

      await createService().changePassword(currentUser, 'OldPass123!', 'NewPass123!');

      expect(repository.findUserById).toHaveBeenCalledWith('user-1');
      expect(repository.updatePassword).toHaveBeenCalledWith('user-1', 'new-hash');
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: AuditAction.AUTH_PASSWORD_CHANGED }),
      );
    });

    it('rejects a wrong current password', async () => {
      hasher.compare.mockResolvedValue(false);

      await expect(
        createService().changePassword(currentUser, 'Wrong123!', 'NewPass123!'),
      ).rejects.toThrow('Current password is incorrect');
      expect(repository.updatePassword).not.toHaveBeenCalled();
    });

    it('rejects a new password equal to the current one', async () => {
      hasher.compare.mockResolvedValue(true);

      await expect(
        createService().changePassword(currentUser, 'SamePass123!', 'SamePass123!'),
      ).rejects.toThrow(BadRequestException);
      expect(repository.updatePassword).not.toHaveBeenCalled();
    });
  });
});
