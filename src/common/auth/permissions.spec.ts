import { hasPermission } from '@common/auth/permissions';

describe('hasPermission', () => {
  it('grants everything with the global wildcard', () => {
    expect(hasPermission(['*'], 'customers:manage')).toBe(true);
    expect(hasPermission(['*'], 'barbershop.appointments:read')).toBe(true);
  });

  it('matches exact permissions', () => {
    expect(hasPermission(['customers:read'], 'customers:read')).toBe(true);
    expect(hasPermission(['customers:read'], 'customers:manage')).toBe(false);
  });

  it('supports resource wildcards, including namespaced module permissions', () => {
    expect(hasPermission(['customers:*'], 'customers:manage')).toBe(true);
    expect(hasPermission(['barbershop.barbers:*'], 'barbershop.barbers:manage')).toBe(true);
    expect(hasPermission(['barbershop.barbers:*'], 'barbershop.appointments:read')).toBe(false);
  });

  it('denies when nothing matches', () => {
    expect(hasPermission([], 'dashboard:read')).toBe(false);
  });
});
