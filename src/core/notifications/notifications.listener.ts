import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TenantContext } from '@common/tenancy/tenant-context.service';
import {
  CoreEvent,
  PaymentApprovedEvent,
  SubscriptionExpiringEvent,
} from '@core/events/core.events';
import { NotificationsService } from '@core/notifications/notifications.service';

/** Generic notifications triggered by core events. Segment-specific messages live in their modules. */
@Injectable()
export class CoreNotificationsListener {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly tenantContext: TenantContext,
  ) {}

  @OnEvent(CoreEvent.PAYMENT_APPROVED, { async: true, promisify: true, suppressErrors: true })
  async onPaymentApproved(event: PaymentApprovedEvent): Promise<void> {
    if (!event.customerId) return;
    const customerId = event.customerId;

    await this.tenantContext.runForTenant(event.tenantId, () =>
      this.notificationsService.notifyCustomer({
        customerId,
        subject: 'Pagamento aprovado',
        body: `Recebemos seu pagamento de ${event.currency} ${event.amount}. Obrigado!`,
        metadata: { paymentId: event.paymentId },
      }),
    );
  }

  @OnEvent(CoreEvent.SUBSCRIPTION_EXPIRING, { async: true, promisify: true, suppressErrors: true })
  async onSubscriptionExpiring(event: SubscriptionExpiringEvent): Promise<void> {
    await this.tenantContext.runForTenant(event.tenantId, () =>
      this.notificationsService.notifyCustomer({
        customerId: event.customerId,
        subject: 'Sua assinatura está vencendo',
        body: `Seu plano "${event.planName}" vence em ${event.daysUntilExpiry} dia(s). Renove para manter seus benefícios.`,
        metadata: { subscriptionId: event.subscriptionId },
      }),
    );
  }
}
