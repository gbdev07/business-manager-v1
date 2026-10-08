import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { isPublicRoute } from '@common/guards/jwt-auth.guard';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { AuthenticatedUser } from '@common/types/authenticated-user';

/** Binds the authenticated user's tenant to the request context (JWT → User → Tenant → Context). */
@Injectable()
export class TenantContextGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenantContext: TenantContext,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (isPublicRoute(this.reflector, context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user?.tenantId) {
      throw new ForbiddenException('Authenticated user is not bound to a tenant');
    }

    this.tenantContext.set({
      tenantId: user.tenantId,
      userId: user.id,
      businessType: user.businessType,
    });
    return true;
  }
}
