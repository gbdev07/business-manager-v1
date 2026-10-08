import { BillingInterval } from '@prisma/client';

export const DEFAULT_DURATION_DAYS: Record<BillingInterval, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  SEMIANNUAL: 180,
  YEARLY: 365,
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function daysUntil(date: Date, from = new Date()): number {
  return Math.max(0, Math.ceil((date.getTime() - from.getTime()) / DAY_MS));
}
