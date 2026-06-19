import { Module } from '@nestjs/common';
import { NotificationListeners } from '@notifications/listeners/notification.listeners';
import { NotificationsController } from '@notifications/notifications.controller';
import { NotificationsService } from '@notifications/notifications.service';
import { NotificationProviderFactory } from '@notifications/providers/notification-provider.factory';
import {
  EmailNotificationProvider,
  WhatsAppNotificationProvider,
} from '@notifications/providers/notification.providers';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationProviderFactory,
    EmailNotificationProvider,
    WhatsAppNotificationProvider,
    NotificationListeners,
  ],
  exports: [NotificationsService, NotificationProviderFactory],
})
export class NotificationsModule {}
