import { Injectable } from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';

const withService = { service: { select: { name: true } } } as const;

export type PlanBenefitWithService = Prisma.BarbershopPlanBenefitGetPayload<{
  include: typeof withService;
}>;

@Injectable()
export class PlanBenefitsRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  findByPlan(planId: string): Promise<PlanBenefitWithService[]> {
    return this.prisma.barbershopPlanBenefit.findMany({
      where: { tenantId: this.tenantId, planId },
      include: withService,
      orderBy: { service: { name: 'asc' } },
    });
  }

  async replace(
    planId: string,
    benefits: { serviceId: string; quantityPerCycle: number }[],
  ): Promise<PlanBenefitWithService[]> {
    const tenantId = this.tenantId;

    await this.prisma.$transaction([
      this.prisma.barbershopPlanBenefit.deleteMany({ where: { tenantId, planId } }),
      this.prisma.barbershopPlanBenefit.createMany({
        data: benefits.map((benefit) => ({ ...benefit, planId, tenantId })),
      }),
    ]);

    return this.findByPlan(planId);
  }

  async countCompletedByService(
    customerId: string,
    serviceIds: string[],
    from: Date,
    to: Date,
  ): Promise<Map<string, number>> {
    const rows = await this.prisma.appointment.groupBy({
      by: ['serviceId'],
      where: {
        tenantId: this.tenantId,
        customerId,
        serviceId: { in: serviceIds },
        status: AppointmentStatus.COMPLETED,
        startsAt: { gte: from, lt: to },
      },
      _count: { _all: true },
      orderBy: { serviceId: 'asc' },
    });

    return new Map(rows.map((row) => [row.serviceId, row._count._all]));
  }
}
