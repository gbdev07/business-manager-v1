import { Injectable, Logger } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';
import { paginate, Paginated } from '@common/dto/pagination.dto';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { AuditEntry } from '@core/audit/audit.constants';
import { AuditRepository } from '@core/audit/audit.repository';
import { AuditLogResponseDto, QueryAuditLogsDto } from '@core/audit/dto/audit-log.dto';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly auditRepository: AuditRepository,
    private readonly tenantContext: TenantContext,
  ) {}

  /** Never throws: auditing must not break the business operation being audited. */
  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.auditRepository.create({
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        metadata: (entry.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: entry.ipAddress,
        tenantId:
          entry.tenantId ?? (this.tenantContext.hasTenant() ? this.tenantContext.tenantId : null),
        userId: entry.userId ?? this.tenantContext.userId ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record audit entry "${entry.action}"`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async list(query: QueryAuditLogsDto): Promise<Paginated<AuditLogResponseDto>> {
    const [logs, total] = await this.auditRepository.findMany(query);
    return paginate(logs.map(toAuditLogResponse), total, query);
  }
}

function toAuditLogResponse(log: AuditLog): AuditLogResponseDto {
  return {
    id: log.id,
    userId: log.userId,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    metadata: (log.metadata ?? {}) as Record<string, unknown>,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt,
  };
}
