import { CommissionType, Prisma } from '@prisma/client';
import {
  calculateCommission,
  pickCommissionRule,
  RuleCandidate,
} from '@modules/barbershop/commissions/commission-calculator';

const rule = (overrides: Partial<RuleCandidate>): RuleCandidate => ({
  id: 'r',
  barberId: null,
  serviceId: null,
  productId: null,
  type: CommissionType.PERCENTAGE,
  value: new Prisma.Decimal(10),
  ...overrides,
});

describe('pickCommissionRule', () => {
  const global = rule({ id: 'global' });
  const barberGeneric = rule({ id: 'barber', barberId: 'b1' });
  const service = rule({ id: 'service', serviceId: 's1' });
  const barberService = rule({ id: 'barber-service', barberId: 'b1', serviceId: 's1' });
  const product = rule({ id: 'product', productId: 'p1' });
  const otherBarber = rule({ id: 'other', barberId: 'b2', serviceId: 's1' });

  const all = [global, barberGeneric, service, barberService, product, otherBarber];

  it('prefers barber + item over everything else', () => {
    expect(pickCommissionRule(all, 'b1', { serviceId: 's1' })?.id).toBe('barber-service');
  });

  it('falls back item > barber generic > global', () => {
    expect(pickCommissionRule(all, 'b3', { serviceId: 's1' })?.id).toBe('service');
    expect(pickCommissionRule(all, 'b1', { serviceId: 's9' })?.id).toBe('barber');
    expect(pickCommissionRule(all, 'b3', { serviceId: 's9' })?.id).toBe('global');
  });

  it('never applies item rules to other items or other barbers', () => {
    expect(pickCommissionRule([service, otherBarber], 'b1', { productId: 'p1' })).toBeNull();
    expect(pickCommissionRule([otherBarber], 'b1', { serviceId: 's1' })).toBeNull();
    expect(pickCommissionRule(all, 'b3', { productId: 'p1' })?.id).toBe('product');
  });
});

describe('calculateCommission', () => {
  it('applies percentages with 2-decimal rounding', () => {
    expect(calculateCommission(rule({ value: new Prisma.Decimal(40) }), '45.00').toFixed(2)).toBe(
      '18.00',
    );
    expect(calculateCommission(rule({ value: new Prisma.Decimal(33.33) }), '10').toFixed(2)).toBe(
      '3.33',
    );
  });

  it('applies fixed values per item', () => {
    const fixed = rule({ type: CommissionType.FIXED, value: new Prisma.Decimal(5) });
    expect(calculateCommission(fixed, '100', 3).toFixed(2)).toBe('15.00');
  });
});
