import { CommissionRule, CommissionType, Prisma } from '@prisma/client';

export type RuleCandidate = Pick<
  CommissionRule,
  'id' | 'barberId' | 'serviceId' | 'productId' | 'type' | 'value'
>;

export type CommissionTarget = { serviceId: string } | { productId: string };

/**
 * Picks the most specific active rule for a barber and a service/product:
 * barber + item  >  item  >  barber (generic)  >  global (generic).
 * Item-specific rules never apply to other items.
 */
export function pickCommissionRule<T extends RuleCandidate>(
  rules: T[],
  barberId: string,
  target: CommissionTarget,
): T | null {
  let best: T | null = null;
  let bestScore = -1;

  for (const rule of rules) {
    if (rule.barberId && rule.barberId !== barberId) continue;

    const isGeneric = !rule.serviceId && !rule.productId;
    const matchesItem =
      'serviceId' in target
        ? rule.serviceId === target.serviceId
        : rule.productId === target.productId;

    if (!isGeneric && !matchesItem) continue;

    const score = (matchesItem ? 2 : 0) + (rule.barberId ? 1 : 0);
    if (score > bestScore) {
      best = rule;
      bestScore = score;
    }
  }

  return best;
}

/** PERCENTAGE: base × value / 100. FIXED: value per item (× quantity). */
export function calculateCommission(
  rule: Pick<RuleCandidate, 'type' | 'value'>,
  baseAmount: Prisma.Decimal.Value,
  quantity = 1,
): Prisma.Decimal {
  const base = new Prisma.Decimal(baseAmount);
  const value = new Prisma.Decimal(rule.value);

  const amount =
    rule.type === CommissionType.PERCENTAGE ? base.mul(value).div(100) : value.mul(quantity);

  return amount.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}
