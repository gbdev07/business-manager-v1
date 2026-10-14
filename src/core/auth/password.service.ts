import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationShutdown,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { PasswordHasher } from '@common/security/password-hasher';
import { AuthenticatedUser } from '@common/types/authenticated-user';
import { AuditAction } from '@core/audit/audit.constants';
import { AuditService } from '@core/audit/audit.service';
import { AuthRepository } from '@core/auth/auth.repository';
import { isAllowedToAuthenticate } from '@core/auth/auth.service';
import { buildPasswordResetEmail } from '@core/auth/templates/password-reset.email';
import { hashToken } from '@core/auth/token.service';
import { NotificationsService } from '@core/notifications/notifications.service';
import { NotificationChannel } from '@core/notifications/providers/notification-provider.interface';

const RESET_TOKEN_BYTES = 32;

export const INVALID_RESET_TOKEN_MESSAGE = 'Invalid or expired password reset token';

/**
 * Password recovery (forgot/reset) and authenticated password change.
 * Every successful change revokes all sessions: refresh tokens are revoked and
 * the user's session version is bumped, invalidating outstanding access tokens.
 */
@Injectable()
export class PasswordService implements OnApplicationShutdown {
  private readonly logger = new Logger(PasswordService.name);
  private readonly resetUrl?: string;
  private readonly tokenTtlMinutes: number;
  private readonly requestCooldownMs: number;
  private readonly pendingRequests = new Set<Promise<void>>();

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    configService: ConfigService,
  ) {
    this.resetUrl = configService.get<string>('passwordReset.url');
    this.tokenTtlMinutes = configService.getOrThrow<number>('passwordReset.tokenTtlMinutes');
    this.requestCooldownMs =
      configService.getOrThrow<number>('passwordReset.requestCooldownSeconds') * 1000;

    if (!this.resetUrl) {
      this.logger.warn('PASSWORD_RESET_URL is not configured: password reset e-mails are disabled');
    }
  }

  /**
   * Accepts the request and processes it in the background, so the HTTP response is
   * identical — in content and timing — whether or not the e-mail is registered.
   */
  requestPasswordReset(email: string, ipAddress?: string): void {
    const task = this.processPasswordResetRequest(email, ipAddress).catch((error: unknown) => {
      this.logger.error(
        'Failed to process a password reset request',
        error instanceof Error ? error.stack : undefined,
      );
    });

    this.pendingRequests.add(task);
    void task.finally(() => this.pendingRequests.delete(task));
  }

  async processPasswordResetRequest(email: string, ipAddress?: string): Promise<void> {
    const now = new Date();
    await this.authRepository.deleteExpiredPasswordResetTokens(now);

    const user = await this.authRepository.findUserByEmail(email);
    if (!user || !isAllowedToAuthenticate(user)) {
      return;
    }

    if (!this.resetUrl) {
      this.logger.warn('Password reset requested but PASSWORD_RESET_URL is not configured');
      return;
    }

    const latest = await this.authRepository.findLatestPasswordResetToken(user.id);
    if (latest && now.getTime() - latest.createdAt.getTime() < this.requestCooldownMs) {
      return;
    }

    const token = randomBytes(RESET_TOKEN_BYTES).toString('base64url');
    const record = await this.authRepository.replacePasswordResetToken({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + this.tokenTtlMinutes * 60_000),
    });

    const content = buildPasswordResetEmail({
      name: user.name,
      resetLink: buildResetLink(this.resetUrl, token),
      expiresInMinutes: this.tokenTtlMinutes,
    });

    const result = await this.notificationsService.send({
      channel: NotificationChannel.EMAIL,
      to: user.email,
      subject: content.subject,
      body: content.text,
      html: content.html,
      sensitive: true,
      metadata: { purpose: 'password_reset' },
    });

    if (result.status !== 'SENT') {
      // An undeliverable token is useless and must not stay valid.
      await this.authRepository.deletePasswordResetToken(record.id);
      this.logger.warn(`Password reset e-mail was not delivered (status: ${result.status})`);
    }

    await this.auditService.record({
      action: AuditAction.AUTH_PASSWORD_RESET_REQUESTED,
      tenantId: user.tenantId,
      userId: user.id,
      entity: 'user',
      entityId: user.id,
      ipAddress,
      metadata: { delivery: result.status },
    });
  }

  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<void> {
    // Hashing first keeps the token row locked only for the short database transaction.
    const passwordHash = await this.passwordHasher.hash(newPassword);
    const user = await this.authRepository.consumePasswordResetToken(
      hashToken(token),
      passwordHash,
      new Date(),
    );

    if (!user) {
      await this.auditService.record({
        action: AuditAction.AUTH_PASSWORD_RESET_FAILED,
        ipAddress,
        metadata: { reason: 'invalid_expired_or_used_token' },
      });
      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    await this.auditService.record({
      action: AuditAction.AUTH_PASSWORD_RESET_COMPLETED,
      tenantId: user.tenantId,
      userId: user.id,
      entity: 'user',
      entityId: user.id,
      ipAddress,
      metadata: { sessionsRevoked: true },
    });
  }

  /** The account is always the authenticated one; it never comes from the payload. */
  async changePassword(
    currentUser: AuthenticatedUser,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
  ): Promise<void> {
    const user = await this.authRepository.findUserById(currentUser.id);
    if (!user || !isAllowedToAuthenticate(user)) {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (!(await this.passwordHasher.compare(currentPassword, user.passwordHash))) {
      await this.auditService.record({
        action: AuditAction.AUTH_PASSWORD_CHANGE_FAILED,
        userId: user.id,
        ipAddress,
        metadata: { reason: 'wrong_current_password' },
      });
      throw new BadRequestException('Current password is incorrect');
    }

    if (newPassword === currentPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    await this.authRepository.updatePassword(user.id, await this.passwordHasher.hash(newPassword));
    await this.auditService.record({
      action: AuditAction.AUTH_PASSWORD_CHANGED,
      userId: user.id,
      entity: 'user',
      entityId: user.id,
      ipAddress,
      metadata: { sessionsRevoked: true },
    });
  }

  /** Resolves once every reset request accepted so far has been processed. */
  async drainPendingRequests(): Promise<void> {
    await Promise.allSettled([...this.pendingRequests]);
  }

  onApplicationShutdown(): Promise<void> {
    return this.drainPendingRequests();
  }
}

/** The base URL comes only from server configuration, never from the request. */
function buildResetLink(baseUrl: string, token: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('token', token);
  return url.toString();
}
