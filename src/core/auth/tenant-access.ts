import { BusinessType, TenantStatus } from '@prisma/client';
import { AccessibleTenantDto } from '@core/auth/dto/auth.dto';

/** Fields required to decide whether a membership may authorize a session. */
export interface TenantAccessView {
  isActive: boolean;
  tenantId: string;
  role: { key: string; permissions: string[] };
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
    businessType: BusinessType;
  };
}

export function isUsableMembership(membership: TenantAccessView): boolean {
  return membership.isActive && membership.tenant.status === TenantStatus.ACTIVE;
}

/**
 * Login enters the home tenant when that membership can still authenticate.
 * Otherwise the oldest usable membership wins (callers pass `createdAt` order).
 */
export function selectLoginMembership<T extends TenantAccessView>(
  homeTenantId: string,
  memberships: T[],
): T | undefined {
  const usable = memberships.filter(isUsableMembership);
  return usable.find((membership) => membership.tenantId === homeTenantId) ?? usable[0];
}

export function toAccessibleTenants(
  memberships: TenantAccessView[],
  currentTenantId: string,
): AccessibleTenantDto[] {
  return memberships
    .filter(isUsableMembership)
    .map((membership) => ({
      id: membership.tenant.id,
      name: membership.tenant.name,
      slug: membership.tenant.slug,
      status: membership.tenant.status,
      businessType: membership.tenant.businessType,
      role: membership.role.key,
      isCurrent: membership.tenantId === currentTenantId,
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
