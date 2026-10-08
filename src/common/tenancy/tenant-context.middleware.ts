import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from '@common/tenancy/tenant-context.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenantContext: TenantContext) {}

  use(_req: Request, _res: Response, next: NextFunction): void {
    this.tenantContext.run(() => next());
  }
}
