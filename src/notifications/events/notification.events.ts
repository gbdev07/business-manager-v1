import { NOTIFICATION_EVENTS } from '@notifications/constants/notification.constants';
import {
  AppointmentNotificationPayload,
  PaymentApprovedPayload,
  SubscriptionExpiringPayload,
} from '@notifications/events/notification-payloads';

export class AppointmentCreatedEvent {
  static readonly eventName = NOTIFICATION_EVENTS.APPOINTMENT_CREATED;

  constructor(readonly payload: AppointmentNotificationPayload) {}
}

export class AppointmentConfirmedEvent {
  static readonly eventName = NOTIFICATION_EVENTS.APPOINTMENT_CONFIRMED;

  constructor(readonly payload: AppointmentNotificationPayload) {}
}

export class SubscriptionExpiringEvent {
  static readonly eventName = NOTIFICATION_EVENTS.SUBSCRIPTION_EXPIRING;

  constructor(readonly payload: SubscriptionExpiringPayload) {}
}

export class PaymentApprovedEvent {
  static readonly eventName = NOTIFICATION_EVENTS.PAYMENT_APPROVED;

  constructor(readonly payload: PaymentApprovedPayload) {}
}
