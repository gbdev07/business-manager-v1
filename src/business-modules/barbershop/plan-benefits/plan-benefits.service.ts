import { BadRequestException, Injectable } from '@nestjs/common';
import { ServicesService } from '@core/services/services.service';
import { SubscriptionsService } from '@core/subscriptions/subscriptions.service';
import {
  PlanBenefitResponseDto,
  ReplacePlanBenefitsDto,
  SubscriptionUsageResponseDto,
} from '@modules/barbershop/plan-benefits/dto/plan-benefit.dto';
import {
  PlanBenefitsRepository,
  PlanBenefitWithService,
} from '@modules/barbershop/plan-benefits/plan-benefits.repository';

/**
 * Barbershop rules on top of the generic core subscription: which services a plan
 * includes and how many times per cycle.
 */
@Injectable()
export class PlanBenefitsService {
  constructor(
    private readonly repository: PlanBenefitsRepository,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly servicesService: ServicesService,
  ) {}

  async list(planId: string): Promise<PlanBenefitResponseDto[]> {
    await this.subscriptionsService.getPlanOrThrow(planId);
    return (await this.repository.findByPlan(planId)).map(toBenefitResponse);
  }

  async replace(planId: string, dto: ReplacePlanBenefitsDto): Promise<PlanBenefitResponseDto[]> {
    await this.subscriptionsService.getPlanOrThrow(planId);

    const serviceIds = dto.benefits.map((benefit) => benefit.serviceId);
    if (new Set(serviceIds).size !== serviceIds.length) {
      throw new BadRequestException('Each service can appear only once');
    }

    const services = await this.servicesService.findActiveByIds(serviceIds);
    const missing = serviceIds.filter((id) => !services.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(`Services not found or inactive: ${missing.join(', ')}`);
    }

    return (await this.repository.replace(planId, dto.benefits)).map(toBenefitResponse);
  }

  async usage(subscriptionId: string): Promise<SubscriptionUsageResponseDto> {
    const subscription = await this.subscriptionsService.getOrThrow(subscriptionId);
    const benefits = await this.repository.findByPlan(subscription.planId);
    const used = await this.repository.countCompletedByService(
      subscription.customerId,
      benefits.map((benefit) => benefit.serviceId),
      subscription.startDate,
      subscription.endDate,
    );

    return {
      subscriptionId: subscription.id,
      cycleStart: subscription.startDate,
      cycleEnd: subscription.endDate,
      benefits: benefits.map((benefit) => {
        const count = used.get(benefit.serviceId) ?? 0;
        return {
          ...toBenefitResponse(benefit),
          used: count,
          remaining: Math.max(0, benefit.quantityPerCycle - count),
        };
      }),
    };
  }
}

function toBenefitResponse(benefit: PlanBenefitWithService): PlanBenefitResponseDto {
  return {
    serviceId: benefit.serviceId,
    serviceName: benefit.service.name,
    quantityPerCycle: benefit.quantityPerCycle,
  };
}
