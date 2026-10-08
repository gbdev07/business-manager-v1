import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { hasPermission } from '@common/auth/permissions';
import { PERMISSIONS_KEY } from '@common/decorators/auth.decorators';
import { AuthenticatedUser } from '@common/types/authenticated-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required?.length) {
      return true;
    }

    const user = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>().user;

    if (!user || !required.every((permission) => hasPermission(user.permissions, permission))) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
