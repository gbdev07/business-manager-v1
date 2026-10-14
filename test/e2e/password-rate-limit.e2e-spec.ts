import { INestApplication } from '@nestjs/common';
import { getOptionsToken } from '@nestjs/throttler';
import * as request from 'supertest';
import { PasswordService } from '@core/auth/password.service';
import { EmailNotificationProvider } from '@core/notifications/providers/smtp-email.provider';
import { CapturingEmailProvider } from '../utils/capturing-email.provider';
import { API, createTestApp, uniqueSuffix } from '../utils/create-test-app';

const LIMIT = 3;

describe('Password endpoints rate limiting (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder
        .overrideProvider(EmailNotificationProvider)
        .useValue(new CapturingEmailProvider())
        .overrideProvider(getOptionsToken())
        .useValue({ throttlers: [{ ttl: 60_000, limit: LIMIT }] }),
    );
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.get(PasswordService).drainPendingRequests();
    await app.close();
  });

  it('limits forgot-password per client and answers 429 with Retry-After', async () => {
    const email = `ratelimit${uniqueSuffix()}@test.com`;

    for (let i = 0; i < LIMIT; i++) {
      await http.post(`${API}/auth/forgot-password`).send({ email }).expect(202);
    }

    const blocked = await http.post(`${API}/auth/forgot-password`).send({ email }).expect(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.body).toMatchObject({ statusCode: 429, error: 'Too Many Requests' });
  });

  it('limits reset-password independently from forgot-password', async () => {
    const body = {
      token: 'invalid',
      newPassword: 'StrongPass123!',
      confirmPassword: 'StrongPass123!',
    };

    for (let i = 0; i < LIMIT; i++) {
      await http.post(`${API}/auth/reset-password`).send(body).expect(400);
    }

    await http.post(`${API}/auth/reset-password`).send(body).expect(429);
  });
});
