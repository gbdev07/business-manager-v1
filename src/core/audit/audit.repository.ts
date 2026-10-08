import { Injectable } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { QueryAuditLogsDto } from '@core/audit/dto/audit-log.dto';

@Injectable()
export class AuditRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  /** Not tenant-scoped on purpose: login attempts may happen before a tenant is resolved. */
  create(data: Prisma.AuditLogUncheckedCreateInput): Promise<AuditLog> {
    return this.prisma.auditLog.create({ data });
  }

  async findMany(query: QueryAuditLogsDto): Promise<[AuditLog[], number]> {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: this.tenantId,
      action: query.action,
      entity: query.entity,
      userId: query.userId,
    };

    return this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
  }
}
