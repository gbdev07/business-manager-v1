import { PrismaService } from '@/prisma/prisma.service';
import { TenantContext } from '@common/tenancy/tenant-context.service';

/**
 * Base class for repositories of tenant-owned data.
 * Every query must filter by `this.tenantId`; it is the single isolation point
 * between the request and the database.
 */
export abstract class TenantScopedRepository {
  protected constructor(
    protected readonly prisma: PrismaService,
    private readonly tenantContext: TenantContext,
  ) {}

  protected get tenantId(): string {
    return this.tenantContext.tenantId;
  }
}
