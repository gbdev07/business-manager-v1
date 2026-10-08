import { Injectable } from '@nestjs/common';
import { RefreshToken, Role, Tenant, User } from '@prisma/client';
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
}
