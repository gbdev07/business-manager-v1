import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { BusinessType } from '@prisma/client';
import { toMoneyString } from '@common/utils/money.util';
import { DashboardPeriod } from '@core/dashboard/dashboard-metrics.provider';
import { DashboardRegistry } from '@core/dashboard/dashboard.registry';
import { DashboardRepository } from '@core/dashboard/dashboard.repository';
import {
  DashboardQueryDto,
  DashboardResponseDto,
  DashboardSectionDto,
} from '@core/dashboard/dto/dashboard.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly repository: DashboardRepository,
    private readonly registry: DashboardRegistry,
  ) {}

  async getOverview(
    query: DashboardQueryDto,
    businessType: BusinessType,
  ): Promise<DashboardResponseDto> {
    const period = resolvePeriod(query);
    const [core, modules] = await Promise.all([
      this.coreSection(period),
      this.moduleSections(period, businessType),
    ]);

    return { period, core, modules };
  }

  private async coreSection(period: DashboardPeriod): Promise<DashboardSectionDto> {
    const snapshot = await this.repository.coreMetrics(period);

    return {
      key: 'core',
      label: 'Visão geral',
      metrics: [
        {
          key: 'activeCustomers',
          label: 'Clientes ativos',
          value: snapshot.activeCustomers,
          unit: 'count',
        },
        {
          key: 'newCustomers',
          label: 'Novos clientes',
          value: snapshot.newCustomers,
          unit: 'count',
        },
        { key: 'salesCount', label: 'Vendas', value: snapshot.salesCount, unit: 'count' },
        {
          key: 'salesTotal',
          label: 'Total vendido',
          value: toMoneyString(snapshot.salesTotal ?? 0),
          unit: 'currency',
        },
        {
          key: 'revenue',
          label: 'Faturamento recebido',
          value: toMoneyString(snapshot.revenue ?? 0),
          unit: 'currency',
        },
        {
          key: 'servicesPerformed',
          label: 'Serviços vendidos',
          value: snapshot.servicesPerformed ?? 0,
          unit: 'count',
        },
      ],
    };
  }

  /** A failing module provider must not break the whole dashboard. */
  private async moduleSections(
    period: DashboardPeriod,
    businessType: BusinessType,
  ): Promise<DashboardSectionDto[]> {
    const providers = this.registry.providersFor(businessType);
    const results = await Promise.allSettled(
      providers.map((provider) => provider.getMetrics(period)),
    );

    return results.flatMap((result, index) => {
      const provider = providers[index];

      if (result.status === 'rejected') {
        this.logger.error(`Dashboard provider "${provider.key}" failed`, String(result.reason));
        return [];
      }

      return [{ key: provider.key, label: provider.label, metrics: result.value }];
    });
  }
}

function resolvePeriod(query: DashboardQueryDto): DashboardPeriod {
  const now = new Date();
  const from = query.from ? new Date(query.from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.to ? new Date(query.to) : now;

  if (from > to) {
    throw new BadRequestException('"from" must be before "to"');
  }

  return { from, to };
}
