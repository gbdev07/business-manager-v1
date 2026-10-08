import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessType } from '@prisma/client';
import { Request } from 'express';
import { BUSINESS_MODULE_KEY } from '@common/decorators/auth.decorators';
import { AuthenticatedUser } from '@common/types/authenticated-user';

@Injectable()
export class BusinessModuleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<BusinessType[]>(BUSINESS_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowed?.length) {
      return true;
    }

    const user = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>().user;

    if (!user || !allowed.includes(user.businessType)) {
      throw new ForbiddenException('This module is not enabled for your business type');
    }

    return true;
  }
}
