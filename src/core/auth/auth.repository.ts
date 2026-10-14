import { Injectable } from '@nestjs/common';
import {
  PasswordResetToken,
  Prisma,
  RefreshToken,
  Role,
  Tenant,
  TenantStatus,
  User,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

export type AuthUserRecord = User & {
  role: Role;
  tenant: Pick<Tenant, 'id' | 'status' | 'businessType'>;
};

const authInclude = {
  role: true,
  tenant: { select: { id: true, status: true, businessType: true } },
} as const;

/**
 * Authentication runs before a tenant is resolved, so these queries are intentionally
 * not tenant-scoped. They only look users up by unique identifiers.
 */
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findUnique({ where: { email }, include: authInclude });
  }

  findUserById(id: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findUnique({ where: { id }, include: authInclude });
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  }

  createRefreshToken(data: {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({ data });
  }

  findRefreshToken(id: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { id } });
  }

  /** Returns false when the token was already revoked (possible replay). */
  async revokeRefreshToken(id: string): Promise<boolean> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count === 1;
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  findLatestPasswordResetToken(userId: string): Promise<PasswordResetToken | null> {
    return this.prisma.passwordResetToken.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Issues a new reset token, invalidating any token still pending for the user. */
  replacePasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    return this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: data.userId, usedAt: null } });
      return tx.passwordResetToken.create({ data });
    });
  }

  async deletePasswordResetToken(id: string): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({ where: { id } });
  }

  async deleteExpiredPasswordResetTokens(now: Date): Promise<number> {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    return result.count;
  }

  /**
   * Atomically claims a valid reset token and applies the new password.
   * The conditional update locks the token row, so concurrent attempts with the same
   * token serialize and only the first one succeeds. Returns null when the token is
   * unknown, expired, already used or belongs to an account that cannot authenticate.
   */
  consumePasswordResetToken(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<Pick<User, 'id' | 'tenantId'> | null> {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: {
          tokenHash,
          usedAt: null,
          expiresAt: { gt: now },
          user: { isActive: true, tenant: { status: TenantStatus.ACTIVE } },
        },
        data: { usedAt: now },
      });

      if (claimed.count !== 1) {
        return null;
      }

      const token = await tx.passwordResetToken.findUniqueOrThrow({
        where: { tokenHash },
        select: { user: { select: { id: true, tenantId: true } } },
      });

      await applyPasswordChange(tx, token.user.id, passwordHash, now);
      return token.user;
    });
  }

  /** Persists a new password and revokes every session of the user. */
  updatePassword(userId: string, passwordHash: string): Promise<void> {
    return this.prisma.$transaction((tx) =>
      applyPasswordChange(tx, userId, passwordHash, new Date()),
    );
  }
}

async function applyPasswordChange(
  tx: Prisma.TransactionClient,
  userId: string,
  passwordHash: string,
  now: Date,
): Promise<void> {
  await tx.user.update({
    where: { id: userId },
    data: { passwordHash, passwordChangedAt: now, sessionVersion: { increment: 1 } },
  });
  await tx.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: now },
  });
  await tx.passwordResetToken.deleteMany({ where: { userId, usedAt: null } });
}
