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

  async issue(payload: AccessTokenPayload): Promise<IssuedTokens> {
    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: payload.sub, jti };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: this.accessTtl }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.refreshSecret,
        expiresIn: this.refreshTtl,
      }),
    ]);

    await this.authRepository.createRefreshToken({
      id: jti,
      userId: payload.sub,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
    });

    return { accessToken, refreshToken, expiresIn: this.accessTtl };
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
