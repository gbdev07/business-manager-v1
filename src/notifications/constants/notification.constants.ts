export enum NotificationChannel {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
}

export const NOTIFICATION_EVENTS = {
  APPOINTMENT_CREATED: 'notification.appointment.created',
  APPOINTMENT_CONFIRMED: 'notification.appointment.confirmed',
  SUBSCRIPTION_EXPIRING: 'notification.subscription.expiring',
  PAYMENT_APPROVED: 'notification.payment.approved',
} as const;

export type NotificationEventName = (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS];

export const NOTIFICATION_READ_ROLES = ['super_admin', 'owner', 'manager', 'receptionist'] as const;
