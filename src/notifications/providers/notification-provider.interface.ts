import { NotificationChannel } from '@notifications/constants/notification.constants';

export interface SendNotificationInput {
  to: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationSendResult {
  messageId: string;
  channel: NotificationChannel;
  status: 'sent' | 'queued' | 'failed';
  providerPayload?: Record<string, unknown>;
}

export interface NotificationProvider {
  readonly channel: NotificationChannel;

  isAvailable(): boolean;

  send(input: SendNotificationInput): Promise<NotificationSendResult>;
}
