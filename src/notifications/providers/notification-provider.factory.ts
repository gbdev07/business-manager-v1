import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationChannel } from '@notifications/constants/notification.constants';
import { NotificationProvider } from '@notifications/providers/notification-provider.interface';
import {
  EmailNotificationProvider,
  WhatsAppNotificationProvider,
} from '@notifications/providers/notification.providers';

@Injectable()
export class NotificationProviderFactory {
  private readonly providers: Map<NotificationChannel, NotificationProvider>;

  constructor(
    emailProvider: EmailNotificationProvider,
    whatsAppProvider: WhatsAppNotificationProvider,
  ) {
    this.providers = new Map<NotificationChannel, NotificationProvider>([
      [NotificationChannel.EMAIL, emailProvider],
      [NotificationChannel.WHATSAPP, whatsAppProvider],
    ]);
  }

  getProvider(channel: NotificationChannel): NotificationProvider {
    const provider = this.providers.get(channel);

    if (!provider) {
      throw new BadRequestException(`Notification channel "${channel}" is not registered`);
    }

    return provider;
  }

  listProviders(): NotificationChannel[] {
    return [...this.providers.keys()];
  }
}
