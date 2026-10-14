import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  NotificationChannel,
  NotificationMessage,
  NotificationProvider,
  NotificationResult,
} from '@core/notifications/providers/notification-provider.interface';

/** Placeholder until a concrete delivery integration is implemented (README roadmap, phase 3). */
abstract class NotIntegratedNotificationProvider implements NotificationProvider {
  abstract readonly channel: NotificationChannel;

  isAvailable(): boolean {
    return false;
  }

  send(_message: NotificationMessage): Promise<NotificationResult> {
    return Promise.reject(
      new NotImplementedException(`Notification channel ${this.channel} is not integrated yet`),
    );
  }
}

@Injectable()
export class WhatsAppNotificationProvider extends NotIntegratedNotificationProvider {
  readonly channel = NotificationChannel.WHATSAPP;
}

@Injectable()
export class PushNotificationProvider extends NotIntegratedNotificationProvider {
  readonly channel = NotificationChannel.PUSH;
}
