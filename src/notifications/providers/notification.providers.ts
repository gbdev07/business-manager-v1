import { Injectable, NotImplementedException } from '@nestjs/common';
import { NotificationChannel } from '@notifications/constants/notification.constants';
import {
  NotificationProvider,
  NotificationSendResult,
  SendNotificationInput,
} from '@notifications/providers/notification-provider.interface';

@Injectable()
export class EmailNotificationProvider implements NotificationProvider {
  readonly channel = NotificationChannel.EMAIL;

  isAvailable(): boolean {
    return false;
  }

  send(_input: SendNotificationInput): Promise<NotificationSendResult> {
    throw new NotImplementedException(
      'Email integration is not implemented yet. Configure SMTP or a provider such as SendGrid.',
    );
  }
}

@Injectable()
export class WhatsAppNotificationProvider implements NotificationProvider {
  readonly channel = NotificationChannel.WHATSAPP;

  isAvailable(): boolean {
    return false;
  }

  send(_input: SendNotificationInput): Promise<NotificationSendResult> {
    throw new NotImplementedException(
      'WhatsApp integration is not implemented yet. Configure Meta Cloud API or a provider such as Twilio.',
    );
  }
}
