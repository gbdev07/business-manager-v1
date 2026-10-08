import { Prisma } from '@prisma/client';

export function toMoneyString(value: Prisma.Decimal | number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return '0.00';
  }

  return new Prisma.Decimal(value).toFixed(2);
}

export function toNullableMoneyString(
  value: Prisma.Decimal | number | string | null | undefined,
): string | null {
  return value === null || value === undefined ? null : toMoneyString(value);
}
