import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NOTIFICATION_EVENTS,
  NotificationChannel,
} from '@notifications/constants/notification.constants';
import {
  AppointmentNotificationPayload,
  PaymentApprovedPayload,
  SubscriptionExpiringPayload,
} from '@notifications/events/notification-payloads';
import {
  NotificationProvidersResponseDto,
  NotificationEventsResponseDto,
} from '@notifications/dto/notification-response.dto';
import { NotificationProviderFactory } from '@notifications/providers/notification-provider.factory';
import {
  NotificationSendResult,
  SendNotificationInput,
} from '@notifications/providers/notification-provider.interface';
import {
  buildAppointmentConfirmedMessage,
  buildAppointmentCreatedMessage,
  buildPaymentApprovedMessage,
  buildSubscriptionExpiringMessage,
} from '@notifications/utils/notification-message.builder';
import { AppLogger } from '@common/logger/app.logger';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly providerFactory: NotificationProviderFactory,
    private readonly configService: ConfigService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('NotificationsService');
  }

  listProviders(): NotificationProvidersResponseDto {
    return {
      available: this.providerFactory.listProviders(),
      note: 'EMAIL and WHATSAPP providers are registered as stubs — implement gateway clients when ready.',
    };
  }

  listEvents(): NotificationEventsResponseDto {
    return {
      events: Object.values(NOTIFICATION_EVENTS),
      note: 'Events are emitted via NestJS EventEmitter and handled asynchronously by listeners.',
    };
  }

  async notifyAppointmentCreated(payload: AppointmentNotificationPayload): Promise<void> {
    const message = buildAppointmentCreatedMessage(payload);
    await this.dispatchToCustomer(payload, message, {
      event: NOTIFICATION_EVENTS.APPOINTMENT_CREATED,
      appointmentId: payload.appointmentId,
    });
  }

  async notifyAppointmentConfirmed(payload: AppointmentNotificationPayload): Promise<void> {
    const message = buildAppointmentConfirmedMessage(payload);
    await this.dispatchToCustomer(payload, message, {
      event: NOTIFICATION_EVENTS.APPOINTMENT_CONFIRMED,
      appointmentId: payload.appointmentId,
    });
  }

  async notifySubscriptionExpiring(payload: SubscriptionExpiringPayload): Promise<void> {
    const message = buildSubscriptionExpiringMessage(payload);
    await this.dispatchToCustomer(payload, message, {
      event: NOTIFICATION_EVENTS.SUBSCRIPTION_EXPIRING,
      enrollmentId: payload.enrollmentId,
    });
  }

  async notifyPaymentApproved(payload: PaymentApprovedPayload): Promise<void> {
    const message = buildPaymentApprovedMessage(payload);
    await this.dispatchToCustomer(payload, message, {
      event: NOTIFICATION_EVENTS.PAYMENT_APPROVED,
      paymentId: payload.paymentId,
    });
  }

  private async dispatchToCustomer(
    contact: {
      customerName: string;
      customerEmail?: string | null;
      customerPhone?: string | null;
    },
    message: { subject: string; body: string },
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const enabledChannels = this.resolveEnabledChannels();
    const tasks: Promise<NotificationSendResult | null>[] = [];

    if (enabledChannels.includes(NotificationChannel.EMAIL) && contact.customerEmail) {
      tasks.push(
        this.sendSafely(NotificationChannel.EMAIL, {
          to: contact.customerEmail,
          subject: message.subject,
          body: message.body,
          metadata,
        }),
      );
    }

    if (enabledChannels.includes(NotificationChannel.WHATSAPP) && contact.customerPhone) {
      tasks.push(
        this.sendSafely(NotificationChannel.WHATSAPP, {
          to: contact.customerPhone,
          body: message.body,
          metadata,
        }),
      );
    }

    if (tasks.length === 0) {
      if (this.configService.get<boolean>('notifications.devLogEnabled')) {
        this.logger.log(
          `[DEV] ${String(metadata.event)} → ${contact.customerName}: ${message.body.replace(/\n/g, ' | ')}`,
        );
      } else {
        this.logger.warn(
          `No notification channels available for ${contact.customerName} (event=${String(metadata.event)})`,
        );
      }
      return;
    }

    await Promise.all(tasks);
  }

  private async sendSafely(
    channel: NotificationChannel,
    input: SendNotificationInput,
  ): Promise<NotificationSendResult | null> {
    const provider = this.providerFactory.getProvider(channel);

    try {
      const result = await provider.send(input);
      this.logger.log(`Notification sent via ${channel} to ${input.to} (${result.messageId})`);
      return result;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';

      if (this.configService.get<boolean>('notifications.devLogEnabled')) {
        this.logger.log(
          `[DEV:${channel}] to=${input.to} subject=${input.subject ?? '(none)'} body=${input.body}`,
        );
        return null;
      }

      this.logger.warn(`Notification via ${channel} skipped: ${reason}`);
      return null;
    }
  }

  private resolveEnabledChannels(): NotificationChannel[] {
    const configured = this.configService.get<string[]>('notifications.enabledChannels') ?? [
      NotificationChannel.EMAIL,
      NotificationChannel.WHATSAPP,
    ];

    return configured.filter((channel) =>
      Object.values(NotificationChannel).includes(channel as NotificationChannel),
    ) as NotificationChannel[];
  }
}
