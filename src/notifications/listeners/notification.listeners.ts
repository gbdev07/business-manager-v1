import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  AppointmentConfirmedEvent,
  AppointmentCreatedEvent,
  PaymentApprovedEvent,
  SubscriptionExpiringEvent,
} from '@notifications/events/notification.events';
import { NotificationsService } from '@notifications/notifications.service';

@Injectable()
export class NotificationListeners {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent(AppointmentCreatedEvent.eventName, { async: true })
  handleAppointmentCreated(event: AppointmentCreatedEvent): Promise<void> {
    return this.notificationsService.notifyAppointmentCreated(event.payload);
  }

  @OnEvent(AppointmentConfirmedEvent.eventName, { async: true })
  handleAppointmentConfirmed(event: AppointmentConfirmedEvent): Promise<void> {
    return this.notificationsService.notifyAppointmentConfirmed(event.payload);
  }

  @OnEvent(SubscriptionExpiringEvent.eventName, { async: true })
  handleSubscriptionExpiring(event: SubscriptionExpiringEvent): Promise<void> {
    return this.notificationsService.notifySubscriptionExpiring(event.payload);
  }

  @OnEvent(PaymentApprovedEvent.eventName, { async: true })
  handlePaymentApproved(event: PaymentApprovedEvent): Promise<void> {
    return this.notificationsService.notifyPaymentApproved(event.payload);
  }
}
