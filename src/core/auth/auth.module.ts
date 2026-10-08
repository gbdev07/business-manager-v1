import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { BusinessModuleGuard } from '@common/guards/business-module.guard';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@common/guards/permissions.guard';
import { TenantContextGuard } from '@common/guards/tenant-context.guard';
import { AuthController } from '@core/auth/auth.controller';
import { AuthRepository } from '@core/auth/auth.repository';
import { AuthService } from '@core/auth/auth.service';
import { JwtStrategy } from '@core/auth/strategies/jwt.strategy';
import { TokenService } from '@core/auth/token.service';
import { TenantsModule } from '@core/tenants/tenants.module';

@Module({
  imports: [
    PassportModule,
    TenantsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.secret'),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
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
