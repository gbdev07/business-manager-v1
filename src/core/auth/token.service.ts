import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import { AccessTokenPayload, RefreshTokenPayload } from '@common/types/authenticated-user';
import { AuthRepository } from '@core/auth/auth.repository';
import { parseDurationToSeconds } from '@core/auth/utils/duration.util';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Access-token claims except `sid`, which is the id of the refresh token created with them. */
export interface SessionClaims {
  sub: string;
  tenantId: string;
  role: string;
  sv: number;
}

/**
 * Access tokens: short-lived JWT signed with JWT_SECRET.
 * Refresh tokens: JWT signed with JWT_REFRESH_SECRET whose hash is stored,
 * allowing rotation and revocation.
 */
@Injectable()
export class TokenService {
  private readonly accessTtl: number;
  private readonly refreshTtl: number;
  private readonly refreshSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository,
    configService: ConfigService,
  ) {
    this.accessTtl = parseDurationToSeconds(configService.getOrThrow<string>('jwt.expiresIn'));
    this.refreshTtl = parseDurationToSeconds(
      configService.getOrThrow<string>('jwt.refreshExpiresIn'),
    );
    this.refreshSecret = configService.getOrThrow<string>('jwt.refreshSecret');
  }

  async issue(claims: SessionClaims): Promise<IssuedTokens> {
    const signed = await this.signSession(claims);
    await this.authRepository.createRefreshToken({
      id: signed.sessionId,
      userId: claims.sub,
      tenantId: claims.tenantId,
      tokenHash: hashToken(signed.refreshToken),
      expiresAt: signed.expiresAt,
    });

    return {
      accessToken: signed.accessToken,
      refreshToken: signed.refreshToken,
      expiresIn: this.accessTtl,
    };
  }

  /**
   * Replaces a single live session. Other refresh tokens of the user are left untouched.
   * Returns null when that session was already revoked.
   */
  async replaceSession(oldSessionId: string, claims: SessionClaims): Promise<IssuedTokens | null> {
    const signed = await this.signSession(claims);
    const replaced = await this.authRepository.replaceRefreshToken(oldSessionId, claims.sub, {
      id: signed.sessionId,
      userId: claims.sub,
      tenantId: claims.tenantId,
      tokenHash: hashToken(signed.refreshToken),
      expiresAt: signed.expiresAt,
    });

    if (!replaced) {
      return null;
    }

    return {
      accessToken: signed.accessToken,
      refreshToken: signed.refreshToken,
      expiresIn: this.accessTtl,
    };
  }

  private async signSession(claims: SessionClaims): Promise<{
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }> {
    const sessionId = randomUUID();
    const accessPayload: AccessTokenPayload = { ...claims, sid: sessionId };
    const refreshPayload: RefreshTokenPayload = { sub: claims.sub, jti: sessionId };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, { expiresIn: this.accessTtl }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl,
      }),
    ]);

    return {
      sessionId,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
    };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
