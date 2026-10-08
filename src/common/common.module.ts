import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter';
import { PasswordHasher } from '@common/security/password-hasher';
import { TenantContextMiddleware } from '@common/tenancy/tenant-context.middleware';
import { TenantContext } from '@common/tenancy/tenant-context.service';

@Global()
@Module({
  providers: [
    TenantContext,
    PasswordHasher,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
  exports: [TenantContext, PasswordHasher],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*path');
  }
}
