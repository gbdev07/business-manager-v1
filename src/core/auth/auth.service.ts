import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { PasswordHasher } from '@common/security/password-hasher';
import { AccessTokenPayload, AuthenticatedUser } from '@common/types/authenticated-user';
import { AuditAction } from '@core/audit/audit.constants';
import { AuditService } from '@core/audit/audit.service';
import { AuthRepository, AuthUserRecord, MembershipRecord } from '@core/auth/auth.repository';
import { AccessibleTenantDto, AuthResponseDto, AuthUserDto } from '@core/auth/dto/auth.dto';
import {
  isUsableMembership,
  selectLoginMembership,
  toAccessibleTenants,
} from '@core/auth/tenant-access';
import { hashToken, TokenService } from '@core/auth/token.service';
import { RegisterTenantDto } from '@core/tenants/dto/tenant.dto';
import { TenantProvisioningService } from '@core/tenants/tenant-provisioning.service';

export const TENANT_ACCESS_DENIED_MESSAGE = 'You do not have access to this tenant';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly passwordHasher: PasswordHasher,
    private readonly tenantProvisioning: TenantProvisioningService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterTenantDto): Promise<AuthResponseDto> {
    const { tenant, owner } = await this.tenantProvisioning.provision(dto);

    await this.auditService.record({
      action: AuditAction.TENANT_REGISTERED,
      tenantId: tenant.id,
      userId: owner.id,
      entity: 'tenant',
      entityId: tenant.id,
      metadata: { businessType: tenant.businessType },
    });

    const user = await this.authRepository.findUserById(owner.id);
    const membership = user
      ? selectLoginMembership(user.tenantId, await this.authRepository.listMemberships(user.id))
      : undefined;

    if (!user || !membership) {
      throw new InternalServerErrorException('Owner membership was not created');
    }

    return this.buildAuthResponse(user, membership);
  }

  async login(email: string, password: string, ipAddress?: string): Promise<AuthResponseDto> {
    const user = await this.authRepository.findUserByEmail(email.toLowerCase());
    const passwordMatches = user
      ? await this.passwordHasher.compare(password, user.passwordHash)
      : false;
    const membership =
      user && passwordMatches && user.isActive
        ? selectLoginMembership(user.tenantId, await this.authRepository.listMemberships(user.id))
        : undefined;

    if (!user || !passwordMatches || !user.isActive || !membership) {
      await this.auditService.record({
        action: AuditAction.AUTH_LOGIN_FAILED,
        tenantId: user?.tenantId,
        userId: user?.id,
        ipAddress,
        metadata: { email: email.toLowerCase() },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.authRepository.touchLastLogin(user.id);
    await this.auditService.record({
      action: AuditAction.AUTH_LOGIN,
      tenantId: membership.tenantId,
      userId: user.id,
      ipAddress,
    });

    return this.buildAuthResponse(user, membership);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);
    const stored = await this.authRepository.findRefreshToken(payload.jti);

    if (!stored || stored.tokenHash !== hashToken(refreshToken) || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const revoked = await this.authRepository.revokeRefreshToken(stored.id);
    if (!revoked) {
      // Reuse of a rotated token: revoke the whole session family for safety.
      await this.authRepository.revokeAllRefreshTokens(stored.userId);
      throw new UnauthorizedException('Refresh token has already been used');
    }

    const user = await this.authRepository.findUserById(stored.userId);
    const membership = user
      ? await this.authRepository.findMembership(user.id, stored.tenantId)
      : null;

    if (!user || !user.isActive || !membership || !isUsableMembership(membership)) {
      throw new UnauthorizedException('User is inactive');
    }

    return this.buildAuthResponse(user, membership);
  }

  async logout(refreshToken: string, currentUser: AuthenticatedUser): Promise<void> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    if (payload.sub !== currentUser.id) {
      throw new UnauthorizedException('Refresh token does not belong to the current user');
    }

    await this.authRepository.revokeRefreshToken(payload.jti);
    await this.auditService.record({ action: AuditAction.AUTH_LOGOUT });
  }

  /** Tenants the authenticated identity can enter. Inactive memberships and tenants are omitted. */
  async listAccessibleTenants(currentUser: AuthenticatedUser): Promise<AccessibleTenantDto[]> {
    const memberships = await this.authRepository.listMemberships(currentUser.id);
    return toAccessibleTenants(memberships, currentUser.tenantId);
  }

  /**
   * Moves this session to another tenant the user can access.
   * Only the refresh token identified by the access token is replaced.
   */
  async switchTenant(
    currentUser: AuthenticatedUser,
    tenantId: string,
    ipAddress?: string,
  ): Promise<AuthResponseDto> {
    if (!currentUser.sessionId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const user = await this.authRepository.findUserById(currentUser.id);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const membership = await this.authRepository.findMembership(user.id, tenantId);
    if (!membership || !isUsableMembership(membership)) {
      await this.auditService.record({
        action: AuditAction.AUTH_TENANT_SWITCH_FAILED,
        tenantId: currentUser.tenantId,
        userId: user.id,
        ipAddress,
        metadata: { reason: 'membership_unavailable' },
      });
      throw new ForbiddenException(TENANT_ACCESS_DENIED_MESSAGE);
    }

    const tokens = await this.tokenService.replaceSession(currentUser.sessionId, {
      sub: user.id,
      tenantId: membership.tenantId,
      role: membership.role.key,
      sv: user.sessionVersion,
    });

    if (!tokens) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    await this.auditService.record({
      action: AuditAction.AUTH_TENANT_SWITCHED,
      tenantId: membership.tenantId,
      userId: user.id,
      entity: 'tenant',
      entityId: membership.tenantId,
      ipAddress,
      metadata: { fromTenantId: currentUser.tenantId },
    });

    return { ...tokens, tokenType: 'Bearer', user: toAuthenticatedUser(user, membership) };
  }

  /**
   * Called by JwtStrategy on every authenticated request. Access tokens issued before
   * the last password change/reset carry an outdated session version and are rejected.
   * The tenant and role come from the session membership, not from a client-supplied id.
   */
  async resolveAuthenticatedUser(payload: AccessTokenPayload): Promise<AuthenticatedUser | null> {
    if (!payload.sid) {
      return null;
    }

    const user = await this.authRepository.findUserById(payload.sub);
    if (!user || !user.isActive || user.sessionVersion !== payload.sv) {
      return null;
    }

    const session = await this.authRepository.findRefreshToken(payload.sid);
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt < new Date() ||
      session.userId !== user.id ||
      session.tenantId !== payload.tenantId
    ) {
      return null;
    }

    const membership = await this.authRepository.findMembership(user.id, payload.tenantId);
    if (!membership || !isUsableMembership(membership) || membership.role.key !== payload.role) {
      return null;
    }

    return {
      ...toAuthenticatedUser(user, membership),
      sessionId: payload.sid,
    };
  }

  private async buildAuthResponse(
    user: AuthUserRecord,
    membership: MembershipRecord,
  ): Promise<AuthResponseDto> {
    const tokens = await this.tokenService.issue({
      sub: user.id,
      tenantId: membership.tenantId,
      role: membership.role.key,
      sv: user.sessionVersion,
    });

    return { ...tokens, tokenType: 'Bearer', user: toAuthenticatedUser(user, membership) };
  }
}

export function isAllowedToAuthenticate(user: AuthUserRecord): boolean {
  return user.isActive && user.tenant.status === TenantStatus.ACTIVE;
}

export function toPublicAuthUser(user: AuthenticatedUser): AuthUserDto {
  return {
    id: user.id,
    tenantId: user.tenantId,
    businessType: user.businessType,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions,
  };
}

function toAuthenticatedUser(user: AuthUserRecord, membership: MembershipRecord): AuthUserDto {
  return {
    id: user.id,
    tenantId: membership.tenantId,
    businessType: membership.tenant.businessType,
    email: user.email,
    name: user.name,
    role: membership.role.key,
    permissions: membership.role.permissions,
  };
}
