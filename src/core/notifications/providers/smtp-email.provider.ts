import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';
import {
  NotificationChannel,
  NotificationMessage,
  NotificationProvider,
  NotificationResult,
} from '@core/notifications/providers/notification-provider.interface';

interface SmtpConfig {
  host?: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}

/**
 * Delivers e-mails through any SMTP server (SES, SendGrid, Mailgun, Mailpit, ...).
 * Stays unavailable — and nothing is sent — until SMTP_HOST and EMAIL_FROM are configured.
 */
@Injectable()
export class EmailNotificationProvider implements NotificationProvider {
  readonly channel = NotificationChannel.EMAIL;

  private readonly logger = new Logger(EmailNotificationProvider.name);
  private readonly from?: string;
  private readonly transporter?: Transporter;

  constructor(configService: ConfigService) {
    const smtp = configService.get<SmtpConfig>('email.smtp');
    this.from = configService.get<string>('email.from');

    if (smtp?.host && this.from) {
      this.transporter = createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
      });
    } else {
      this.logger.warn('E-mail delivery is disabled: SMTP_HOST and EMAIL_FROM are not configured');
    }
  }

  isAvailable(): boolean {
    return this.transporter !== undefined;
  }

  async send(message: NotificationMessage): Promise<NotificationResult> {
    if (!this.transporter) {
      throw new Error('E-mail provider is not configured');
    }

    const info = (await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      text: message.body,
      html: message.html,
    })) as { messageId?: string };

    return { channel: this.channel, status: 'SENT', providerMessageId: info.messageId };
  }
}
