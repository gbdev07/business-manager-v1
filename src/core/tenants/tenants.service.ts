import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditAction } from '@core/audit/audit.constants';
import { AuditService } from '@core/audit/audit.service';
import {
  TenantResponseDto,
  UpdateTenantDto,
  UpdateTenantSettingsDto,
} from '@core/tenants/dto/tenant.dto';
import { toTenantResponse } from '@core/tenants/tenant.mapper';
import { TenantsRepository } from '@core/tenants/tenants.repository';

@Injectable()
export class TenantsService {
  constructor(
    private readonly tenantsRepository: TenantsRepository,
    private readonly auditService: AuditService,
  ) {}

  async getCurrent(): Promise<TenantResponseDto> {
    const tenant = await this.tenantsRepository.findCurrent();

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return toTenantResponse(tenant);
  }

  async updateCurrent(dto: UpdateTenantDto): Promise<TenantResponseDto> {
    const tenant = await this.tenantsRepository.updateCurrent({
      ...dto,
      email: dto.email?.toLowerCase(),
      currency: dto.currency?.toUpperCase(),
    });

    await this.auditService.record({
      action: AuditAction.TENANT_UPDATED,
      entity: 'tenant',
      entityId: tenant.id,
      metadata: { fields: Object.keys(dto) },
    });

    return toTenantResponse(tenant);
  }

  async updateSettings(dto: UpdateTenantSettingsDto): Promise<TenantResponseDto> {
    const current = await this.getCurrent();
    const tenant = await this.tenantsRepository.updateCurrent({
      settings: { ...current.settings, ...dto.settings } as Prisma.InputJsonValue,
    });

    await this.auditService.record({
      action: AuditAction.TENANT_UPDATED,
      entity: 'tenant',
      entityId: tenant.id,
      metadata: { settings: Object.keys(dto.settings) },
    });

    return toTenantResponse(tenant);
  }
}
