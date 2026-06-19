import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@prisma/prisma.service';
import { AuthResponseDto } from '@auth/dto/auth-response.dto';
import { AuthenticatedUser, JwtPayload } from '@auth/interfaces/authenticated-user.interface';
import {
  addDurationToDate,
  generateRefreshToken,
  hashToken,
  parseDurationToSeconds,
} from '@auth/utils/token.util';

type UserWithMemberships = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  deletedAt: Date | null;
  memberships: {
    isActive: boolean;
    deletedAt: Date | null;
    barbershop: { id: string; slug: string };
    role: { slug: string };
  }[];
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string): Promise<AuthResponseDto> {
    const user = await this.findUserByEmail(email);

    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const tokenHash = hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              where: {
                isActive: true,
                deletedAt: null,
              },
              include: {
                barbershop: { select: { id: true, slug: true } },
                role: { select: { slug: true } },
              },
            },
          },
        },
      },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = storedToken.user;

    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException('User not found or inactive');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return this.buildAuthResponse(user);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    const tokenHash = hashToken(refreshToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.revokedAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return { message: 'Logged out successfully' };
  }

  async validateUserById(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        memberships: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          include: {
            barbershop: { select: { id: true, slug: true } },
            role: { select: { slug: true } },
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return this.mapToAuthenticatedUser(user);
  }

  private async findUserByEmail(email: string): Promise<UserWithMemberships | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          include: {
            barbershop: { select: { id: true, slug: true } },
            role: { select: { slug: true } },
          },
        },
      },
    });
  }

  private async buildAuthResponse(user: UserWithMemberships): Promise<AuthResponseDto> {
    const accessExpiresInConfig = this.configService.getOrThrow<string>('jwt.accessExpiresIn');
    const refreshExpiresInConfig = this.configService.getOrThrow<string>('jwt.refreshExpiresIn');

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = generateRefreshToken();
    const expiresIn = parseDurationToSeconds(accessExpiresInConfig);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: addDurationToDate(refreshExpiresInConfig),
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
      user: this.mapToAuthenticatedUser(user),
    };
  }

  private mapToAuthenticatedUser(user: UserWithMemberships): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isSuperAdmin: user.isSuperAdmin,
      memberships: user.memberships.map((membership) => ({
        barbershopId: membership.barbershop.id,
        barbershopSlug: membership.barbershop.slug,
        roleSlug: membership.role.slug,
      })),
    };
  }
}
