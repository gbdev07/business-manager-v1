import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { BusinessType } from '@prisma/client';
import { Request } from 'express';
import { AuthenticatedUser } from '@common/types/authenticated-user';

export const IS_PUBLIC_KEY = 'isPublic';
export const PERMISSIONS_KEY = 'permissions';
export const BUSINESS_MODULE_KEY = 'businessModule';

/** Skips JWT authentication and tenant resolution. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Requires every listed permission. */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Restricts a business-module controller/handler to tenants of the given segments.
 * This is the single place where businessType gates behavior (BusinessModuleGuard).
 */
export const BusinessModule = (...businessTypes: BusinessType[]) =>
  SetMetadata(BUSINESS_MODULE_KEY, businessTypes);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>();
    return request.user;
  },
);
