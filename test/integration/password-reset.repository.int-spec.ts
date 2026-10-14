import { BusinessType, TenantStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthRepository } from '@core/auth/auth.repository';
import { hashToken } from '@core/auth/token.service';

/** AuthRepository password flows against a real database (never production). */
describe('AuthRepository password reset (integration)', () => {
  const prisma = new PrismaService();
  const repository = new AuthRepository(prisma);
  const suffix = `${Date.now()}`;
  let tenantId: string;
  let userId: string;

  const inOneHour = () => new Date(Date.now() + 60 * 60_000);

  async function createToken(expiresAt = inOneHour()): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt },
    });
    return token;
  }

  beforeAll(async () => {
    await prisma.$connect();
    const role = await prisma.role.findUniqueOrThrow({ where: { key: 'OWNER' } });
    const tenant = await prisma.tenant.create({
      data: { name: 'int-pwd', slug: `int-pwd-${suffix}`, businessType: BusinessType.SERVICES },
    });
    tenantId = tenant.id;
    const user = await prisma.user.create({
      data: {
        tenantId,
        roleId: role.id,
        name: 'Integration',
        email: `int-pwd-${suffix}@test.com`,
        passwordHash: 'initial-hash',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.tenant.delete({ where: { id: tenantId } });
    await prisma.$disconnect();
  });

  it('lets exactly one of many concurrent attempts consume the same token', async () => {
    const tokenHash = hashToken(await createToken());

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        repository.consumePasswordResetToken(tokenHash, `hash-${i}`, new Date()),
      ),
    );

    expect(results.filter((result) => result !== null)).toHaveLength(1);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.passwordHash).toMatch(/^hash-\d$/);
  });

  it('applies the password change atomically with session revocation', async () => {
    const before = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    await prisma.refreshToken.create({
      data: { userId, tenantId, tokenHash: `rt-${suffix}`, expiresAt: inOneHour() },
    });
    const token = await createToken();
    const pending = await createToken();

    const result = await repository.consumePasswordResetToken(
      hashToken(token),
      'reset-hash',
      new Date(),
    );

    expect(result).toEqual({ id: userId, tenantId });
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(after.passwordHash).toBe('reset-hash');
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
    expect(after.passwordChangedAt).not.toBeNull();
    expect(await prisma.refreshToken.count({ where: { userId, revokedAt: null } })).toBe(0);
    expect(
      await prisma.passwordResetToken.count({ where: { tokenHash: hashToken(pending) } }),
    ).toBe(0);
  });

  it('refuses expired tokens', async () => {
    const token = await createToken(new Date(Date.now() - 1000));
    expect(
      await repository.consumePasswordResetToken(hashToken(token), 'x', new Date()),
    ).toBeNull();
  });

  it('refuses tokens of accounts that can no longer authenticate', async () => {
    const token = await createToken();
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { status: TenantStatus.SUSPENDED },
    });

    try {
      expect(
        await repository.consumePasswordResetToken(hashToken(token), 'x', new Date()),
      ).toBeNull();
    } finally {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { status: TenantStatus.ACTIVE },
      });
    }
  });

  it('removes only expired tokens during cleanup', async () => {
    const expired = await createToken(new Date(Date.now() - 1000));
    const valid = await createToken();

    await repository.deleteExpiredPasswordResetTokens(new Date());

    expect(
      await prisma.passwordResetToken.count({ where: { tokenHash: hashToken(expired) } }),
    ).toBe(0);
    expect(await prisma.passwordResetToken.count({ where: { tokenHash: hashToken(valid) } })).toBe(
      1,
    );
  });
});
