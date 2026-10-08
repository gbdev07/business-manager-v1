import { Injectable } from '@nestjs/common';
import { Prisma, Subscription, SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantScopedRepository } from '@common/tenancy/tenant-scoped.repository';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import { QueryPlansDto, QuerySubscriptionsDto } from '@core/subscriptions/dto/subscription.dto';

export type SubscriptionWithPlan = Subscription & { plan: Pick<SubscriptionPlan, 'name'> };

const withPlan = { plan: { select: { name: true } } } as const;

@Injectable()
export class SubscriptionsRepository extends TenantScopedRepository {
  constructor(prisma: PrismaService, tenantContext: TenantContext) {
    super(prisma, tenantContext);
  }

  findPlans(query: QueryPlansDto): Promise<[SubscriptionPlan[], number]> {
    const where: Prisma.SubscriptionPlanWhereInput = {
      tenantId: this.tenantId,
      isActive: query.isActive,
    };

    return this.prisma.$transaction([
      this.prisma.subscriptionPlan.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);
  }

  findPlanById(id: string): Promise<SubscriptionPlan | null> {
    return this.prisma.subscriptionPlan.findFirst({ where: { id, tenantId: this.tenantId } });
  }

  createPlan(
    data: Omit<Prisma.SubscriptionPlanUncheckedCreateInput, 'tenantId'>,
  ): Promise<SubscriptionPlan> {
    return this.prisma.subscriptionPlan.create({ data: { ...data, tenantId: this.tenantId } });
  }

  updatePlan(id: string, data: Prisma.SubscriptionPlanUpdateInput): Promise<SubscriptionPlan> {
    return this.prisma.subscriptionPlan.update({ where: { id, tenantId: this.tenantId }, data });
  }

  findMany(query: QuerySubscriptionsDto): Promise<[SubscriptionWithPlan[], number]> {
    const where: Prisma.SubscriptionWhereInput = {
      tenantId: this.tenantId,
      status: query.status,
      customerId: query.customerId,
      planId: query.planId,
    };

    return this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        include: withPlan,
        orderBy: { startDate: 'desc' },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.subscription.count({ where }),
    ]);
  }

  findById(id: string): Promise<SubscriptionWithPlan | null> {
    return this.prisma.subscription.findFirst({
      where: { id, tenantId: this.tenantId },
      include: withPlan,
    });
  }

  findActiveForCustomerAndPlan(customerId: string, planId: string): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: { tenantId: this.tenantId, customerId, planId, status: SubscriptionStatus.ACTIVE },
    });
  }

  findActiveEndingBetween(from: Date, to: Date): Promise<SubscriptionWithPlan[]> {
    return this.prisma.subscription.findMany({
      where: {
        tenantId: this.tenantId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: from, lte: to },
      },
      include: withPlan,
      orderBy: { endDate: 'asc' },
    });
  }

  async expireOverdue(now: Date): Promise<number> {
    const result = await this.prisma.subscription.updateMany({
      where: { tenantId: this.tenantId, status: SubscriptionStatus.ACTIVE, endDate: { lt: now } },
      data: { status: SubscriptionStatus.EXPIRED },
    });
    return result.count;
  }

  create(
    data: Omit<Prisma.SubscriptionUncheckedCreateInput, 'tenantId'>,
  ): Promise<SubscriptionWithPlan> {
    return this.prisma.subscription.create({
      data: { ...data, tenantId: this.tenantId },
      include: withPlan,
    });
  }

  update(id: string, data: Prisma.SubscriptionUpdateInput): Promise<SubscriptionWithPlan> {
    return this.prisma.subscription.update({
      where: { id, tenantId: this.tenantId },
      data,
      include: withPlan,
    });
  }
}
