import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { API, createTestApp } from '../utils/create-test-app';

const DEMO = { email: 'admin@demo.com', password: 'Admin123!' };

describe('Auth & HTTP pipeline (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health is public', async () => {
    const res = await http.get(`${API}/health`).expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('rejects unauthenticated requests with the standard error body', async () => {
    const res = await http.get(`${API}/customers`).expect(401);
    expect(res.body).toEqual(
      expect.objectContaining({
        statusCode: 401,
        message: expect.any(String),
        error: expect.any(String),
        timestamp: expect.any(String),
        path: `${API}/customers`,
      }),
    );
  });

  it('rejects invalid credentials', async () => {
    await http
      .post(`${API}/auth/login`)
      .send({ ...DEMO, password: 'wrong' })
      .expect(401);
  });

  it('logs in, exposes the tenant business type and rotates refresh tokens', async () => {
    const login = await http.post(`${API}/auth/login`).send(DEMO).expect(200);
    expect(login.body.user).toMatchObject({
      email: DEMO.email,
      role: 'OWNER',
      businessType: 'BARBERSHOP',
    });

    const me = await http
      .get(`${API}/auth/me`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body.tenantId).toBe(login.body.user.tenantId);

    const refreshed = await http
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);

    // Replaying a rotated token is treated as theft: every session of the user is revoked.
    await http
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
    await http
      .post(`${API}/auth/refresh`)
      .send({ refreshToken: refreshed.body.refreshToken })
      .expect(401);
  });

  it('never accepts tenantId from the client (forbidNonWhitelisted)', async () => {
    const login = await http.post(`${API}/auth/login`).send(DEMO).expect(200);

    const res = await http
      .post(`${API}/customers`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ name: 'Intruso', tenantId: '00000000-0000-0000-0000-000000000000' })
      .expect(400);
    expect(res.body.statusCode).toBe(400);
  });
});
