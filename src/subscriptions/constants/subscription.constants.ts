export const SUBSCRIPTION_WRITE_ROLES = [
  'super_admin',
  'owner',
  'manager',
  'receptionist',
] as const;

export const SUBSCRIPTION_READ_ROLES = [
  'super_admin',
  'owner',
  'manager',
  'receptionist',
  'barber',
] as const;

/** Active enrollment statuses eligible for renewal or cancellation. */
export const RENEWABLE_STATUSES = ['ACTIVE', 'EXPIRED'] as const;

export const CANCELLABLE_ENROLLMENT_STATUSES = ['ACTIVE', 'PAUSED', 'EXPIRED'] as const;

/**
 * Future automatic renewal rules — ready for a scheduled job / payment integration.
 * - Renew when `autoRenew=true` and `nextRenewalAt <= now`
 * - Retry up to `maxRenewalAttempts` within `gracePeriodDays` after expiration
 */
export const AUTO_RENEWAL_RULES = {
  enabled: true,
  gracePeriodDays: 3,
  maxRenewalAttempts: 3,
  /** Days before endDate to schedule next renewal attempt */
  renewalLeadDays: 1,
} as const;

export const DEFAULT_PLAN_DURATION_DAYS: Record<string, number> = {
  WEEKLY: 7,
  MONTHLY: 30,
  QUARTERLY: 90,
  YEARLY: 365,
};
