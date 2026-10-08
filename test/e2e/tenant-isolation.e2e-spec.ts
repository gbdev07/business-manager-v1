import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { API, createTestApp, uniqueSuffix } from '../utils/create-test-app';

describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let barbershopToken: string;
  let retailToken: string;
  let barbershopCustomerId: string;

  beforeAll(async () => {
    app = await createTestApp();
    http = request(app.getHttpServer());

    const login = await http
      .post(`${API}/auth/login`)
      .send({ email: 'admin@demo.com', password: 'Admin123!' })
      .expect(200);
    barbershopToken = login.body.accessToken;

    const suffix = uniqueSuffix();
    const customer = await http
      .post(`${API}/customers`)
      .set('Authorization', `Bearer ${barbershopToken}`)
      .send({ name: 'Cliente Isolado', email: `isolado${suffix}@test.com` })
      .expect(201);
    barbershopCustomerId = customer.body.id;

    const register = await http
      .post(`${API}/auth/register`)
      .send({
        businessName: `Loja ${suffix}`,
        businessType: 'RETAIL',
        ownerName: 'Dona da Loja',
        email: `owner${suffix}@loja.com`,
        password: 'Senha123!',
      })
      .expect(201);
    retailToken = register.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const asRetail = (req: request.Test) => req.set('Authorization', `Bearer ${retailToken}`);

  it('a new tenant starts with no customers', async () => {
    const res = await asRetail(http.get(`${API}/customers`)).expect(200);
    expect(res.body.meta.total).toBe(0);
  });

  it('cannot read or modify another tenant records (404, not 403, to avoid leaking existence)', async () => {
    await asRetail(http.get(`${API}/customers/${barbershopCustomerId}`)).expect(404);
    await asRetail(
      http.patch(`${API}/customers/${barbershopCustomerId}`).send({ name: 'Hacked' }),
    ).expect(404);
    await asRetail(http.get(`${API}/customers/${barbershopCustomerId}/history`)).expect(404);
  });

  it('cannot access business modules of another segment', async () => {
    const res = await asRetail(http.get(`${API}/barbershop/barbers`)).expect(403);
    expect(res.body.message).toContain('not enabled');
  });

  it('only receives dashboard metrics from modules of its segment', async () => {
    const res = await asRetail(http.get(`${API}/dashboard`)).expect(200);
    expect(res.body.core.metrics.length).toBeGreaterThan(0);
    expect(res.body.modules).toEqual([]);
  });
});
