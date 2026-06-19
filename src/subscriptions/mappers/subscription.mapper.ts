import { Subscription, SubscriptionType } from '@prisma/client';
import {
  SubscriptionEnrollmentResponseDto,
  SubscriptionPlanResponseDto,
} from '@subscriptions/dto/subscription-response.dto';
import { joinFullName } from '@customers/utils/name.util';
import { parseBenefits } from '@subscriptions/utils/subscription.util';

type EnrollmentWithRelations = Subscription & {
  parentPlan: { name: string } | null;
  customer: { firstName: string; lastName: string } | null;
};

export function mapPlanToResponse(plan: Subscription): SubscriptionPlanResponseDto {
  return {
    id: plan.id,
    barbershopId: plan.barbershopId,
    type: SubscriptionType.PLAN,
    name: plan.name,
    description: plan.description,
    price: plan.price.toString(),
    currency: plan.currency,
    interval: plan.interval,
    durationDays: plan.durationDays,
    benefits: parseBenefits(plan.benefits),
    status: plan.status,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

export function mapEnrollmentToResponse(
  enrollment: EnrollmentWithRelations,
): SubscriptionEnrollmentResponseDto {
  if (
    !enrollment.parentPlan ||
    !enrollment.customer ||
    !enrollment.planId ||
    !enrollment.customerId
  ) {
    throw new Error('Enrollment is missing required relations');
  }

  return {
    id: enrollment.id,
    barbershopId: enrollment.barbershopId,
    type: SubscriptionType.ENROLLMENT,
    planId: enrollment.planId,
    planName: enrollment.parentPlan.name,
    customerId: enrollment.customerId,
    customerName: joinFullName(enrollment.customer.firstName, enrollment.customer.lastName),
    price: enrollment.price.toString(),
    currency: enrollment.currency,
    durationDays: enrollment.durationDays,
    benefits: parseBenefits(enrollment.benefits),
    status: enrollment.status,
    startDate: enrollment.startDate!,
    endDate: enrollment.endDate!,
    autoRenew: enrollment.autoRenew,
    nextRenewalAt: enrollment.nextRenewalAt,
    createdAt: enrollment.createdAt,
    updatedAt: enrollment.updatedAt,
  };
}

export const enrollmentInclude = {
  parentPlan: { select: { name: true } },
  customer: { select: { firstName: true, lastName: true } },
} as const;
