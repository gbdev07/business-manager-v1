import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import { paginate, Paginated } from '@common/dto/pagination.dto';
import { toMoneyString } from '@common/utils/money.util';
import { AuditAction } from '@core/audit/audit.constants';
import { AuditService } from '@core/audit/audit.service';
import { CustomersService } from '@core/customers/customers.service';
import { CoreEvent, SubscriptionExpiringEvent } from '@core/events/core.events';
import {
  CancelSubscriptionDto,
  CreateSubscriptionDto,
  CreateSubscriptionPlanDto,
  QueryPlansDto,
  QuerySubscriptionsDto,
  SubscriptionPlanResponseDto,
  SubscriptionResponseDto,
  UpdateSubscriptionPlanDto,
} from '@core/subscriptions/dto/subscription.dto';
import {
  addDays,
  daysUntil,
  DEFAULT_DURATION_DAYS,
} from '@core/subscriptions/subscription-period.util';
import {
  SubscriptionsRepository,
  SubscriptionWithPlan,
} from '@core/subscriptions/subscriptions.repository';

const RENEWABLE: SubscriptionStatus[] = [SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED];
const CANCELLABLE: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.PAUSED,
  SubscriptionStatus.EXPIRED,
];

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly repository: SubscriptionsRepository,
    private readonly customersService: CustomersService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ── Plans ────────────────────────────────────────────────────────────────

  async listPlans(query: QueryPlansDto): Promise<Paginated<SubscriptionPlanResponseDto>> {
    const [plans, total] = await this.repository.findPlans(query);
    return paginate(plans.map(toPlanResponse), total, query);
  }

  async findPlan(id: string): Promise<SubscriptionPlanResponseDto> {
    return toPlanResponse(await this.getPlanOrThrow(id));
  }

  async createPlan(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlanResponseDto> {
    const plan = await this.repository.createPlan({
      ...dto,
      durationDays: dto.durationDays ?? DEFAULT_DURATION_DAYS[dto.billingInterval],
    });
    return toPlanResponse(plan);
  }

  async updatePlan(
    id: string,
    dto: UpdateSubscriptionPlanDto,
  ): Promise<SubscriptionPlanResponseDto> {
    const durationDays =
      dto.durationDays ??
      (dto.billingInterval ? DEFAULT_DURATION_DAYS[dto.billingInterval] : undefined);
    return toPlanResponse(await this.repository.updatePlan(id, { ...dto, durationDays }));
  }

  /** Used by business modules to validate plan references within the current tenant. */
  async getPlanOrThrow(id: string): Promise<SubscriptionPlan> {
    const plan = await this.repository.findPlanById(id);

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  // ── Subscriptions ────────────────────────────────────────────────────────

  async list(query: QuerySubscriptionsDto): Promise<Paginated<SubscriptionResponseDto>> {
    const [subscriptions, total] = await this.repository.findMany(query);
    return paginate(subscriptions.map(toSubscriptionResponse), total, query);
  }

  async findById(id: string): Promise<SubscriptionResponseDto> {
    return toSubscriptionResponse(await this.getOrThrow(id));
  }

  async create(dto: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    const plan = await this.getPlanOrThrow(dto.planId);

    if (!plan.isActive) {
      throw new BadRequestException('Subscription plan is inactive');
    }

    await this.customersService.ensureActive(dto.customerId);

    if (await this.repository.findActiveForCustomerAndPlan(dto.customerId, plan.id)) {
      throw new ConflictException('Customer already has an active subscription for this plan');
    }

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const endDate = addDays(startDate, plan.durationDays);
    const autoRenew = dto.autoRenew ?? false;

    const subscription = await this.repository.create({
      planId: plan.id,
      customerId: dto.customerId,
      price: plan.price,
      startDate,
      endDate,
      autoRenew,
      nextRenewalAt: autoRenew ? endDate : null,
    });

    await this.auditService.record({
      action: AuditAction.SUBSCRIPTION_CREATED,
      entity: 'subscription',
      entityId: subscription.id,
      metadata: { planId: plan.id, customerId: dto.customerId },
    });

    return toSubscriptionResponse(subscription);
  }

  async renew(id: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.getOrThrow(id);

    if (!RENEWABLE.includes(subscription.status)) {
      throw new BadRequestException(
        `Cannot renew a subscription with status ${subscription.status}`,
      );
    }

    const plan = await this.getPlanOrThrow(subscription.planId);
    const now = new Date();
    const startDate = subscription.endDate > now ? subscription.endDate : now;
    const endDate = addDays(startDate, plan.durationDays);

    const updated = await this.repository.update(id, {
      status: SubscriptionStatus.ACTIVE,
      startDate,
      endDate,
      price: plan.price,
      nextRenewalAt: subscription.autoRenew ? endDate : null,
    });

    await this.auditService.record({
      action: AuditAction.SUBSCRIPTION_RENEWED,
      entity: 'subscription',
      entityId: id,
      metadata: { endDate },
    });

    return toSubscriptionResponse(updated);
  }

  async cancel(id: string, dto: CancelSubscriptionDto): Promise<SubscriptionResponseDto> {
    const subscription = await this.getOrThrow(id);

    if (!CANCELLABLE.includes(subscription.status)) {
      throw new BadRequestException(
        `Cannot cancel a subscription with status ${subscription.status}`,
      );
    }

    const updated = await this.repository.update(id, {
      status: SubscriptionStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: dto.reason,
      autoRenew: false,
      nextRenewalAt: null,
    });

    await this.auditService.record({
      action: AuditAction.SUBSCRIPTION_CANCELLED,
      entity: 'subscription',
      entityId: id,
      metadata: { reason: dto.reason },
    });

    return toSubscriptionResponse(updated);
  }

  async listExpiring(days: number): Promise<SubscriptionResponseDto[]> {
    const now = new Date();
    const subscriptions = await this.repository.findActiveEndingBetween(now, addDays(now, days));
    return subscriptions.map(toSubscriptionResponse);
  }

  /**
   * Marks overdue subscriptions as EXPIRED and publishes reminder events for the ones ending soon.
   * Exposed as an endpoint for now; a scheduler will call it per tenant later (roadmap phase 3).
   */
  async processLifecycle(reminderDays: number): Promise<{ expired: number; reminded: number }> {
    const now = new Date();
    const expired = await this.repository.expireOverdue(now);
    const expiring = await this.repository.findActiveEndingBetween(now, addDays(now, reminderDays));

    for (const subscription of expiring) {
      this.eventEmitter.emit(
        CoreEvent.SUBSCRIPTION_EXPIRING,
        new SubscriptionExpiringEvent(
          subscription.tenantId,
          subscription.id,
          subscription.customerId,
          subscription.plan.name,
          subscription.endDate,
          daysUntil(subscription.endDate, now),
        ),
      );
    }

    return { expired, reminded: expiring.length };
  }

  /** Used by business modules to validate subscription references within the current tenant. */
  async getOrThrow(id: string): Promise<SubscriptionWithPlan> {
    const subscription = await this.repository.findById(id);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return subscription;
  }
}

function toPlanResponse(plan: SubscriptionPlan): SubscriptionPlanResponseDto {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    price: toMoneyString(plan.price),
    currency: plan.currency,
    billingInterval: plan.billingInterval,
    durationDays: plan.durationDays,
    isActive: plan.isActive,
    createdAt: plan.createdAt,
  };
}

function toSubscriptionResponse(subscription: SubscriptionWithPlan): SubscriptionResponseDto {
  return {
    id: subscription.id,
    planId: subscription.planId,
    planName: subscription.plan.name,
    customerId: subscription.customerId,
    status: subscription.status,
    price: toMoneyString(subscription.price),
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    autoRenew: subscription.autoRenew,
    nextRenewalAt: subscription.nextRenewalAt,
    cancelledAt: subscription.cancelledAt,
    createdAt: subscription.createdAt,
  };
}
