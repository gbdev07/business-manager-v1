import { BusinessType } from '@prisma/client';

export interface DashboardPeriod {
  from: Date;
  to: Date;
}

export type DashboardMetricUnit = 'count' | 'currency' | 'percent';

export interface DashboardMetric {
  key: string;
  label: string;
  /** Currency values are decimal strings to avoid floating point issues. */
  value: number | string;
  unit: DashboardMetricUnit;
}

/**
 * Extension point for business modules. A module registers its provider in the
 * DashboardRegistry and the core dashboard aggregates it for supported tenants.
 * Providers run inside the tenant context, so tenant-scoped repositories work normally.
 */
export interface DashboardMetricsProvider {
  readonly key: string;
  readonly label: string;

  supports(businessType: BusinessType): boolean;

  getMetrics(period: DashboardPeriod): Promise<DashboardMetric[]>;
}
