import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { BusinessType, TenantStatus } from '@prisma/client';
import { AuthenticatedUser } from '@common/types/authenticated-user';
import { AuditAction } from '@core/audit/audit.constants';
import { AuditService } from '@core/audit/audit.service';
import { AuthRepository, AuthUserRecord, MembershipRecord } from '@core/auth/auth.repository';
import { AuthService, TENANT_ACCESS_DENIED_MESSAGE } from '@core/auth/auth.service';
import { hashToken, TokenService } from '@core/auth/token.service';
import { PasswordHasher } from '@common/security/password-hasher';
import { TenantProvisioningService } from '@core/tenants/tenant-provisioning.service';

function user(overrides: Partial<AuthUserRecord> = {}): AuthUserRecord {
  return {
    id: 'user-1',
    tenantId: 'home',
    roleId: 'role-owner',
    name: 'Maria',
    email: 'maria@example.com',
    passwordHash: 'hash',
    isActive: true,
    lastLoginAt: null,
    sessionVersion: 3,
    passwordChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: { key: 'OWNER', permissions: ['*'] } as AuthUserRecord['role'],
    tenant: { id: 'home', status: TenantStatus.ACTIVE, businessType: BusinessType.BARBERSHOP },
    ...overrides,
  };
}

function membership(overrides: Partial<MembershipRecord> = {}): MembershipRecord {
  return {
    id: 'membership-1',
    userId: 'user-1',
    tenantId: 'other',
    roleId: 'role-employee',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    role: {
      key: 'EMPLOYEE',
      permissions: ['customers:read'],
    } as MembershipRecord['role'],
    tenant: {
      id: 'other',
      name: 'Loja',
      slug: 'loja',
      status: TenantStatus.ACTIVE,
      businessType: BusinessType.RETAIL,
    },
    ...overrides,
  };
}

describe('AuthService tenant session', () => {
  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    tenantId: 'home',
    businessType: BusinessType.BARBERSHOP,
    email: 'maria@example.com',
    name: 'Maria',
    role: 'OWNER',
    permissions: ['*'],
    sessionId: 'session-1',
  };

  let repository: {
    findUserById: jest.Mock;
    findMembership: jest.Mock;
    listMemberships: jest.Mock;
    findRefreshToken: jest.Mock;
    revokeRefreshToken: jest.Mock;
  };
  let tokens: { replaceSession: jest.Mock; issue: jest.Mock; verifyRefreshToken: jest.Mock };
  let audit: { record: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    repository = {
      findUserById: jest.fn().mockResolvedValue(user()),
      findMembership: jest.fn().mockResolvedValue(membership()),
      listMemberships: jest.fn().mockResolvedValue([]),
      findRefreshToken: jest.fn(),
      revokeRefreshToken: jest.fn().mockResolvedValue(true),
    };
    tokens = {
      replaceSession: jest.fn().mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 900,
      }),
      issue: jest.fn().mockResolvedValue({
        accessToken: 'issued-access',
        refreshToken: 'issued-refresh',
        expiresIn: 900,
      }),
      verifyRefreshToken: jest.fn().mockResolvedValue({ sub: 'user-1', jti: 'refresh-1' }),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(
      repository as unknown as AuthRepository,
      tokens as unknown as TokenService,
      {} as PasswordHasher,
      {} as TenantProvisioningService,
      audit as unknown as AuditService,
    );
  });

  it('returns an empty list when the user has no usable membership', async () => {
    repository.listMemberships.mockResolvedValue([
      membership({ isActive: false, tenantId: 'home' }),
    ]);

    await expect(service.listAccessibleTenants(currentUser)).resolves.toEqual([]);
  });

  it('lists only tenants the user can access and flags the active one', async () => {
    repository.listMemberships.mockResolvedValue([
      membership({
        tenantId: 'home',
        role: { key: 'OWNER', permissions: ['*'] } as MembershipRecord['role'],
        tenant: {
          id: 'home',
          name: 'Casa',
          slug: 'casa',
          status: TenantStatus.ACTIVE,
          businessType: BusinessType.BARBERSHOP,
        },
      }),
      membership(),
      membership({
        tenantId: 'suspended',
        tenant: {
          id: 'suspended',
          name: 'Parada',
          slug: 'parada',
          status: TenantStatus.SUSPENDED,
          businessType: BusinessType.SERVICES,
        },
      }),
    ]);

    const listed = await service.listAccessibleTenants(currentUser);

    expect(listed.map((item) => item.id)).toEqual(['home', 'other']);
    expect(listed.find((item) => item.id === 'home')).toMatchObject({
      role: 'OWNER',
      isCurrent: true,
    });
    expect(listed.find((item) => item.id === 'other')).toMatchObject({
      role: 'EMPLOYEE',
      isCurrent: false,
    });
  });

  it('refuses a switch without a usable membership and does not rotate the session', async () => {
    repository.findMembership.mockResolvedValue(membership({ isActive: false }));

    await expect(service.switchTenant(currentUser, 'other')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.switchTenant(currentUser, 'missing')).rejects.toThrow(
      TENANT_ACCESS_DENIED_MESSAGE,
    );
    expect(tokens.replaceSession).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.AUTH_TENANT_SWITCH_FAILED }),
    );
  });

  it('switches only the current session and adopts the destination role', async () => {
    const response = await service.switchTenant(currentUser, 'other', '127.0.0.1');

    expect(tokens.replaceSession).toHaveBeenCalledWith('session-1', {
      sub: 'user-1',
      tenantId: 'other',
      role: 'EMPLOYEE',
      sv: 3,
    });
    expect(response.user).toMatchObject({
      tenantId: 'other',
      role: 'EMPLOYEE',
      permissions: ['customers:read'],
      businessType: BusinessType.RETAIL,
    });
    expect(response.user).not.toHaveProperty('sessionId');
    expect(response.accessToken).toBe('new-access');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.AUTH_TENANT_SWITCHED,
        metadata: { fromTenantId: 'home' },
      }),
    );
  });

  it('rejects the switch when the current session was already revoked', async () => {
    tokens.replaceSession.mockResolvedValue(null);

    await expect(service.switchTenant(currentUser, 'other')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refreshes into the tenant stored on that refresh token, not the home tenant', async () => {
    repository.findRefreshToken.mockResolvedValue({
      id: 'refresh-1',
      userId: 'user-1',
      tenantId: 'other',
      tokenHash: hashToken('raw-refresh'),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
    });

    const response = await service.refresh('raw-refresh');

    expect(tokens.issue).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'other', role: 'EMPLOYEE', sub: 'user-1' }),
    );
    expect(response.user.tenantId).toBe('other');
    expect(response.user.role).toBe('EMPLOYEE');
    expect(response.user.permissions).toEqual(['customers:read']);
  });
});
