import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomersService } from '@core/customers/customers.service';
import {
  NOTIFICATION_PROVIDERS,
  NotificationChannel,
  NotificationMessage,
  NotificationProvider,
  NotificationResult,
} from '@core/notifications/providers/notification-provider.interface';

export interface CustomerNotification {
  customerId: string;
  subject: string;
  body: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly providers: Map<NotificationChannel, NotificationProvider>;
  private readonly devLogEnabled: boolean;

  constructor(
    @Inject(NOTIFICATION_PROVIDERS) providers: NotificationProvider[],
    private readonly customersService: CustomersService,
    configService: ConfigService,
  ) {
    this.providers = new Map(providers.map((provider) => [provider.channel, provider]));
    this.devLogEnabled = configService.get<boolean>('notifications.devLogEnabled') ?? true;
  }

  listChannels(): { channel: NotificationChannel; available: boolean }[] {
    return [...this.providers.values()].map((provider) => ({
      channel: provider.channel,
      available: provider.isAvailable(),
    }));
  }

  /** Never throws: a failed notification must not roll back the business operation. */
  async send(message: NotificationMessage): Promise<NotificationResult> {
    const provider = this.providers.get(message.channel);

    if (!provider?.isAvailable()) {
      if (this.devLogEnabled) {
        const content = message.sensitive ? '[sensitive content redacted]' : message.body;
        this.logger.log(
          `[${message.channel} → ${message.to}] ${message.subject ?? ''} ${content}`.trim(),
        );
      }
      return { channel: message.channel, status: 'SKIPPED' };
    }

    try {
      return await provider.send(message);
    } catch (error) {
      this.logger.error(
        `Failed to send ${message.channel} notification`,
        error instanceof Error ? error.stack : undefined,
      );
      return { channel: message.channel, status: 'FAILED' };
    }
  }

  /** Sends through every channel the customer can be reached on. Requires tenant context. */
  async notifyCustomer(notification: CustomerNotification): Promise<NotificationResult[]> {
    const { customerId, ...content } = notification;
    const customer = await this.customersService.findById(customerId);
    const messages: NotificationMessage[] = [];

    if (customer.email) {
      messages.push({ channel: NotificationChannel.EMAIL, to: customer.email, ...content });
    }

    if (customer.phone) {
      messages.push({ channel: NotificationChannel.WHATSAPP, to: customer.phone, ...content });
    }

    return Promise.all(messages.map((message) => this.send(message)));
  }
}
