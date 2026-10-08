import { Injectable, UnauthorizedException } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { PasswordHasher } from '@common/security/password-hasher';
import { AuthenticatedUser } from '@common/types/authenticated-user';
import { AuditAction } from '@core/audit/audit.constants';
import { AuditService } from '@core/audit/audit.service';
import { AuthRepository, AuthUserRecord } from '@core/auth/auth.repository';
import { AuthResponseDto } from '@core/auth/dto/auth.dto';
import { hashToken, TokenService } from '@core/auth/token.service';
import { RegisterTenantDto } from '@core/tenants/dto/tenant.dto';
import { TenantProvisioningService } from '@core/tenants/tenant-provisioning.service';

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
    return this.buildAuthResponse(user!);
  }

  async login(email: string, password: string, ipAddress?: string): Promise<AuthResponseDto> {
    const user = await this.authRepository.findUserByEmail(email.toLowerCase());
    const passwordMatches = user
      ? await this.passwordHasher.compare(password, user.passwordHash)
      : false;

    if (!user || !passwordMatches || !isAllowedToAuthenticate(user)) {
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
      tenantId: user.tenantId,
      userId: user.id,
      ipAddress,
    });

    return this.buildAuthResponse(user);
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
    if (!user || !isAllowedToAuthenticate(user)) {
      throw new UnauthorizedException('User is inactive');
    }

    return this.buildAuthResponse(user);
  }

  async logout(refreshToken: string, currentUser: AuthenticatedUser): Promise<void> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    if (payload.sub !== currentUser.id) {
      throw new UnauthorizedException('Refresh token does not belong to the current user');
    }

    await this.authRepository.revokeRefreshToken(payload.jti);
    await this.auditService.record({ action: AuditAction.AUTH_LOGOUT });
  }

  /** Called by JwtStrategy on every authenticated request. */
  async resolveAuthenticatedUser(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.authRepository.findUserById(userId);
    return user && isAllowedToAuthenticate(user) ? toAuthenticatedUser(user) : null;
  }

  private async buildAuthResponse(user: AuthUserRecord): Promise<AuthResponseDto> {
    const tokens = await this.tokenService.issue({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role.key,
    });

    return { ...tokens, tokenType: 'Bearer', user: toAuthenticatedUser(user) };
  }
}

function isAllowedToAuthenticate(user: AuthUserRecord): boolean {
  return user.isActive && user.tenant.status === TenantStatus.ACTIVE;
}

function toAuthenticatedUser(user: AuthUserRecord): AuthenticatedUser {
  return {
    id: user.id,
    tenantId: user.tenantId,
    businessType: user.tenant.businessType,
    email: user.email,
    name: user.name,
    role: user.role.key,
    permissions: user.role.permissions,
  };
}
