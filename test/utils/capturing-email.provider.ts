import {
  NotificationChannel,
  NotificationMessage,
  NotificationProvider,
  NotificationResult,
} from '@core/notifications/providers/notification-provider.interface';

/** Test double for the SMTP provider: records messages instead of delivering them. */
export class CapturingEmailProvider implements NotificationProvider {
  readonly channel = NotificationChannel.EMAIL;
  readonly sent: NotificationMessage[] = [];
  failing = false;

  isAvailable(): boolean {
    return true;
  }

  send(message: NotificationMessage): Promise<NotificationResult> {
    if (this.failing) {
      return Promise.reject(new Error('SMTP server unavailable'));
    }

    this.sent.push(message);
    return Promise.resolve({ channel: this.channel, status: 'SENT', providerMessageId: 'test' });
  }

  messagesTo(email: string): NotificationMessage[] {
    return this.sent.filter((message) => message.to === email);
  }

  /** Extracts the raw token from the last reset link sent to `email`. */
  lastResetToken(email: string): string | undefined {
    const messages = this.messagesTo(email);
    const message = messages[messages.length - 1];
    return message?.body.match(/[?&]token=([A-Za-z0-9_-]+)/)?.[1];
  }
}
