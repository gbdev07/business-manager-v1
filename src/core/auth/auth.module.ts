import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { BusinessModuleGuard } from '@common/guards/business-module.guard';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { TenantContextGuard } from '@common/guards/tenant-context.guard';
import { AuthController } from '@core/auth/auth.controller';
import { AuthRepository } from '@core/auth/auth.repository';
import { AuthService } from '@core/auth/auth.service';
import { PasswordService } from '@core/auth/password.service';
import { JwtStrategy } from '@core/auth/strategies/jwt.strategy';
import { TokenService } from '@core/auth/token.service';
import { NotificationsModule } from '@core/notifications/notifications.module';
import { TenantsModule } from '@core/tenants/tenants.module';

@Module({
  imports: [
    PassportModule,
    TenantsModule,
    NotificationsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
      }),
    }),
    // Applied per route (@UseGuards(ThrottlerGuard)) to the password endpoints only;
    // counters are kept per client IP and per route, in memory.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.getOrThrow<number>('passwordReset.rateLimit.ttlSeconds') * 1000,
            limit: config.getOrThrow<number>('passwordReset.rateLimit.max'),
          },
        ],
        errorMessage: 'Too many requests, please try again later',
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    AuthRepository,
    TokenService,
    JwtStrategy,
    // Global guards run in declaration order: authenticate → bind tenant → segment → authorize.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantContextGuard },
    { provide: APP_GUARD, useClass: BusinessModuleGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AuthModule {}
