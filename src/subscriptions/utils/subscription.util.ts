import { SubscriptionInterval } from '@prisma/client';
import {
  AUTO_RENEWAL_RULES,
  DEFAULT_PLAN_DURATION_DAYS,
} from '@subscriptions/constants/subscription.constants';

export function resolveDurationDays(
  durationDays?: number | null,
  interval?: SubscriptionInterval | null,
): number {
  if (durationDays && durationDays > 0) {
    return durationDays;
  }

  if (interval && DEFAULT_PLAN_DURATION_DAYS[interval]) {
    return DEFAULT_PLAN_DURATION_DAYS[interval];
  }

  return DEFAULT_PLAN_DURATION_DAYS.MONTHLY;
}

export function calculateEndDate(startDate: Date, durationDays: number): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);
  return endDate;
}

export function calculateNextRenewalAt(endDate: Date): Date {
  const nextRenewal = new Date(endDate);
  nextRenewal.setDate(nextRenewal.getDate() - AUTO_RENEWAL_RULES.renewalLeadDays);
  return nextRenewal;
}

export function isEnrollmentExpired(endDate: Date | null | undefined): boolean {
  if (!endDate) {
    return false;
  }

  return endDate.getTime() < Date.now();
}

export function parseBenefits(benefits: unknown): string[] {
  if (!Array.isArray(benefits)) {
    return [];
  }

  return benefits.filter((item): item is string => typeof item === 'string');
}
