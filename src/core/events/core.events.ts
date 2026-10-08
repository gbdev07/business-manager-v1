import { BusinessType } from '@prisma/client';

/**
 * Domain events published by the core. Business modules subscribe to the ones they care about,
 * so the core never needs to know which segments exist.
 */
export const CoreEvent = {
  TENANT_CREATED: 'core.tenant.created',
  SALE_COMPLETED: 'core.sale.completed',
  PAYMENT_APPROVED: 'core.payment.approved',
  SUBSCRIPTION_EXPIRING: 'core.subscription.expiring',
} as const;

export class TenantCreatedEvent {
  constructor(
    readonly tenantId: string,
    readonly businessType: BusinessType,
  ) {}
}

export class SaleCompletedEvent {
  constructor(
    readonly tenantId: string,
    readonly saleId: string,
    readonly userId: string | null,
    readonly total: string,
  ) {}
}

export class PaymentApprovedEvent {
  constructor(
    readonly tenantId: string,
    readonly paymentId: string,
    readonly customerId: string | null,
    readonly amount: string,
    readonly currency: string,
    readonly paidAt: Date,
  ) {}
}

export class SubscriptionExpiringEvent {
  constructor(
    readonly tenantId: string,
    readonly subscriptionId: string,
    readonly customerId: string,
    readonly planName: string,
    readonly endDate: Date,
    readonly daysUntilExpiry: number,
  ) {}
}
