import { Injectable } from '@nestjs/common';
import { PaymentStatus, Prisma, SaleItemType, SaleStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { DashboardPeriod } from '@core/dashboard/dashboard-metrics.provider';

export interface CoreMetricsSnapshot {
  activeCustomers: number;
  newCustomers: number;
  salesCount: number;
  salesTotal: Prisma.Decimal | null;
  revenue: Prisma.Decimal | null;
  servicesPerformed: number | null;
}

@Injectable()
export class DashboardRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  async coreMetrics({ from, to }: DashboardPeriod): Promise<CoreMetricsSnapshot> {
    const tenantId = this.tenantId;
    const completedSalesInPeriod: Prisma.SaleWhereInput = {
      tenantId,
      status: SaleStatus.COMPLETED,
      completedAt: { gte: from, lte: to },
    };

    const [activeCustomers, newCustomers, sales, payments, services] =
      await this.prisma.$transaction([
        this.prisma.customer.count({ where: { tenantId, isActive: true } }),
        this.prisma.customer.count({ where: { tenantId, createdAt: { gte: from, lte: to } } }),
        this.prisma.sale.aggregate({
          where: completedSalesInPeriod,
          _count: { _all: true },
          _sum: { total: true },
        }),
        this.prisma.payment.aggregate({
          where: { tenantId, status: PaymentStatus.PAID, paidAt: { gte: from, lte: to } },
          _sum: { amount: true },
        }),
        this.prisma.saleItem.aggregate({
          where: { type: SaleItemType.SERVICE, sale: completedSalesInPeriod },
          _sum: { quantity: true },
        }),
      ]);

    return {
      activeCustomers,
      newCustomers,
      salesCount: sales._count._all,
      salesTotal: sales._sum.total,
      revenue: payments._sum.amount,
      servicesPerformed: services._sum.quantity,
    };
  }
}
