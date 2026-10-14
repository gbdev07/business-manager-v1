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
  /** Plain-text content. */
  body: string;
  /** Optional rich content for channels that support it (e-mail). */
  html?: string;
  /** Content carries secrets (e.g. reset links) and must never be written to logs. */
  sensitive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface NotificationResult {
  channel: NotificationChannel;
  /** SKIPPED: no provider configured for the channel. FAILED: the provider rejected it. */
  status: 'SENT' | 'SKIPPED' | 'FAILED';
  providerMessageId?: string;
}

/** Contract for delivery adapters (SMTP/SES, WhatsApp Cloud API, FCM, ...). */
export interface NotificationProvider {
  readonly channel: NotificationChannel;

  isAvailable(): boolean;

  send(message: NotificationMessage): Promise<NotificationResult>;
}
