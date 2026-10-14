import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomersService } from '@core/customers/customers.service';
import { NotificationsService } from '@core/notifications/notifications.service';
import {
  NotificationChannel,
  NotificationProvider,
} from '@core/notifications/providers/notification-provider.interface';

function createService(provider: NotificationProvider): NotificationsService {
  return new NotificationsService(
    [provider],
    {} as CustomersService,
    { get: () => true } as unknown as ConfigService,
  );
}

describe('NotificationsService', () => {
  const message = {
    channel: NotificationChannel.EMAIL,
    to: 'maria@example.com',
    subject: 'Redefinição de senha',
    body: 'https://app.example.com/reset-password?token=secret',
  };

  afterEach(() => jest.restoreAllMocks());

  it('redacts sensitive content from the development log', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const service = createService({
      channel: NotificationChannel.EMAIL,
      isAvailable: () => false,
      send: jest.fn(),
    });

    const result = await service.send({ ...message, sensitive: true });

    expect(result.status).toBe('SKIPPED');
    const logged = log.mock.calls.map((call) => String(call[0])).join('\n');
    expect(logged).not.toContain('token=secret');
    expect(logged).toContain('[sensitive content redacted]');
  });

  it('reports FAILED, without throwing, when the provider rejects the message', async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const service = createService({
      channel: NotificationChannel.EMAIL,
      isAvailable: () => true,
      send: () => Promise.reject(new Error('SMTP down')),
    });

    await expect(service.send(message)).resolves.toEqual({
      channel: NotificationChannel.EMAIL,
      status: 'FAILED',
    });
  });
});
