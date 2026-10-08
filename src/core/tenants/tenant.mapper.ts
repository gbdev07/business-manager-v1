import { Tenant } from '@prisma/client';
import { TenantResponseDto } from '@core/tenants/dto/tenant.dto';

export function toTenantResponse(tenant: Tenant): TenantResponseDto {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    businessType: tenant.businessType,
    status: tenant.status,
    document: tenant.document,
    email: tenant.email,
    phone: tenant.phone,
    timezone: tenant.timezone,
    currency: tenant.currency,
    settings: (tenant.settings ?? {}) as Record<string, unknown>,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  };
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
