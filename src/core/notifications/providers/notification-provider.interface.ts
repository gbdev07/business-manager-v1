export enum NotificationChannel {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  PUSH = 'PUSH',
}

export const NOTIFICATION_PROVIDERS = Symbol('NOTIFICATION_PROVIDERS');

export interface NotificationMessage {
  channel: NotificationChannel;
  /** Email address, phone number (E.164) or device token, depending on the channel. */
  to: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  channel: NotificationChannel;
  status: 'SENT' | 'SKIPPED';
  providerMessageId?: string;
}

/** Contract for delivery adapters (SMTP/SES, WhatsApp Cloud API, FCM, ...). */
export interface NotificationProvider {
  readonly channel: NotificationChannel;

  isAvailable(): boolean;

  send(message: NotificationMessage): Promise<NotificationResult>;
}
