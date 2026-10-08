import { Injectable } from '@nestjs/common';
import { BusinessType } from '@prisma/client';
import { DashboardMetricsProvider } from '@core/dashboard/dashboard-metrics.provider';

@Injectable()
export class DashboardRegistry {
  private readonly providers = new Map<string, DashboardMetricsProvider>();

  register(provider: DashboardMetricsProvider): void {
    this.providers.set(provider.key, provider);
  }

  providersFor(businessType: BusinessType): DashboardMetricsProvider[] {
    return [...this.providers.values()].filter((provider) => provider.supports(businessType));
  }
}
