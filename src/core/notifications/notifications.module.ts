import { Module } from '@nestjs/common';
import { CustomersModule } from '@core/customers/customers.module';
import { NotificationsController } from '@core/notifications/notifications.controller';
import { CoreNotificationsListener } from '@core/notifications/notifications.listener';
import { NotificationsService } from '@core/notifications/notifications.service';
import {
  EmailNotificationProvider,
  PushNotificationProvider,
  WhatsAppNotificationProvider,
} from '@core/notifications/providers/channel.providers';
import {
  NOTIFICATION_PROVIDERS,
  NotificationProvider,
} from '@core/notifications/providers/notification-provider.interface';

const channelProviders = [
  EmailNotificationProvider,
  WhatsAppNotificationProvider,
  PushNotificationProvider,
];

@Module({
  imports: [CustomersModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    CoreNotificationsListener,
    ...channelProviders,
    {
      provide: NOTIFICATION_PROVIDERS,
      useFactory: (...providers: NotificationProvider[]) => providers,
      inject: channelProviders,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
