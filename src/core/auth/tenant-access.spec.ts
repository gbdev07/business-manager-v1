import { BusinessType, TenantStatus } from '@prisma/client';
import {
  TenantAccessView,
  isUsableMembership,
  selectLoginMembership,
  toAccessibleTenants,
} from '@core/auth/tenant-access';

function access(
  overrides: Partial<TenantAccessView> & { tenantId: string; name: string },
): TenantAccessView {
  return {
    isActive: true,
    role: { key: 'OWNER', permissions: ['*'] },
    tenant: {
      id: overrides.tenantId,
      name: overrides.name,
      slug: overrides.name.toLowerCase(),
      status: TenantStatus.ACTIVE,
      businessType: BusinessType.BARBERSHOP,
    },
    ...overrides,
    tenantId: overrides.tenantId,
  };
}

describe('tenant access', () => {
  const home = access({ tenantId: 'home', name: 'Home' });
  const other = access({
    tenantId: 'other',
    name: 'Other',
    role: { key: 'EMPLOYEE', permissions: ['customers:read'] },
    tenant: {
      id: 'other',
      name: 'Other',
      slug: 'other',
      status: TenantStatus.ACTIVE,
      businessType: BusinessType.RETAIL,
    },
  });

  it('treats an inactive membership or a non-active tenant as unusable', () => {
    expect(isUsableMembership(home)).toBe(true);
    expect(isUsableMembership({ ...home, isActive: false })).toBe(false);
    expect(
      isUsableMembership({
        ...home,
        tenant: { ...home.tenant, status: TenantStatus.SUSPENDED },
      }),
    ).toBe(false);
  });

  it('prefers the home tenant and otherwise the first usable membership', () => {
    expect(selectLoginMembership('home', [other, home])?.tenantId).toBe('home');
    expect(selectLoginMembership('home', [{ ...home, isActive: false }, other])?.tenantId).toBe(
      'other',
    );
    expect(selectLoginMembership('home', [{ ...home, isActive: false }])).toBeUndefined();
  });

  it('lists only usable tenants and marks the current one', () => {
    const suspended = access({
      tenantId: 'suspended',
      name: 'Suspended',
      tenant: {
        id: 'suspended',
        name: 'Suspended',
        slug: 'suspended',
        status: TenantStatus.SUSPENDED,
        businessType: BusinessType.SERVICES,
      },
    });

    expect(toAccessibleTenants([other, { ...home, isActive: false }, suspended], 'other')).toEqual([
      expect.objectContaining({ id: 'other', role: 'EMPLOYEE', isCurrent: true }),
    ]);
  });

  it('returns an empty list when the user has no usable membership', () => {
    expect(toAccessibleTenants([], 'home')).toEqual([]);
    expect(toAccessibleTenants([{ ...home, isActive: false }], 'home')).toEqual([]);
  });
});
